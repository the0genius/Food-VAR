import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, refreshTokens } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { logger } from "./logger";

const JWT_SECRET = process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}
const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export interface AuthPayload {
  userId: number;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function verifyAccessToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export async function createRefreshToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return token;
}

export async function rotateRefreshToken(
  oldToken: string,
  userId: number
): Promise<string | null> {
  const oldHash = crypto
    .createHash("sha256")
    .update(oldToken)
    .digest("hex");

  const [existing] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, oldHash),
        eq(refreshTokens.userId, userId),
      )
    )
    .limit(1);

  if (!existing || existing.expiresAt < new Date()) {
    return null;
  }

  if (existing.revokedAt) {
    await revokeAllRefreshTokens(userId);
    return null;
  }

  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, existing.id));

  return createRefreshToken(userId);
}

export async function revokeAllRefreshTokens(userId: number): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt))
    );
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = header.slice(7);
  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.auth = payload;
  next();
}

export function stripSensitiveFields(user: Record<string, unknown>) {
  const { passwordHash, ...safe } = user;
  return safe;
}

interface GoogleTokenPayload {
  sub: string;
  email: string;
  name?: string;
  email_verified?: boolean;
}

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload | null> {
  if (!GOOGLE_CLIENT_ID) {
    logger.error("EXPO_PUBLIC_GOOGLE_CLIENT_ID not configured; Google auth disabled");
    return null;
  }

  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!res.ok) return null;
    const data = await res.json() as Record<string, unknown>;
    if (!data.sub || !data.email) return null;

    if (data.aud !== GOOGLE_CLIENT_ID) {
      logger.error("Google token aud mismatch", { expected: GOOGLE_CLIENT_ID, got: data.aud });
      return null;
    }

    const emailVerified = data.email_verified === "true" || data.email_verified === true;
    if (!emailVerified) {
      logger.error("Google token email not verified");
      return null;
    }

    return {
      sub: String(data.sub),
      email: String(data.email),
      name: typeof data.name === "string" ? data.name : undefined,
      email_verified: emailVerified,
    };
  } catch (err) {
    logger.error("Google token verification failed", err);
    return null;
  }
}

interface AppleTokenPayload {
  sub: string;
  email: string | undefined;
  email_verified?: boolean;
}

const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const APPLE_BUNDLE_ID = process.env.EXPO_PUBLIC_APPLE_BUNDLE_ID || "";

export async function verifyAppleIdToken(idToken: string): Promise<AppleTokenPayload | null> {
  if (!APPLE_BUNDLE_ID) {
    logger.error("EXPO_PUBLIC_APPLE_BUNDLE_ID not configured; Apple auth disabled");
    return null;
  }

  try {
    const jose = await import("jose");
    const JWKS = jose.createRemoteJWKSet(new URL(APPLE_JWKS_URL));

    const jwtOptions: Parameters<typeof jose.jwtVerify>[2] = {
      issuer: "https://appleid.apple.com",
      audience: APPLE_BUNDLE_ID,
    };

    const { payload } = await jose.jwtVerify(idToken, JWKS, jwtOptions);

    if (!payload.sub) return null;

    const claims = payload as Record<string, unknown>;

    return {
      sub: payload.sub,
      email: typeof claims.email === "string" ? claims.email : undefined,
      email_verified: claims.email_verified === true || claims.email_verified === "true",
    };
  } catch (err) {
    logger.error("Apple token verification failed", err);
    return null;
  }
}

export async function findOrCreateSocialUser(
  provider: string,
  providerId: string,
  email: string | undefined,
  name?: string,
): Promise<typeof users.$inferSelect> {
  const [existingByProvider] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.authProvider, provider),
        eq(users.authProviderId, providerId),
        isNull(users.deletedAt),
      )
    )
    .limit(1);

  if (existingByProvider) return existingByProvider;

  if (!email) {
    throw new Error("EMAIL_REQUIRED_FOR_NEW_ACCOUNT");
  }

  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.email, email.toLowerCase()),
        isNull(users.deletedAt),
      )
    )
    .limit(1);

  if (existingByEmail) {
    if (existingByEmail.authProvider && existingByEmail.authProvider !== provider) {
      logger.error("Account already linked to different provider", {
        userId: existingByEmail.id,
        existingProvider: existingByEmail.authProvider,
        attemptedProvider: provider,
      });
      throw new Error("ACCOUNT_LINKED_DIFFERENT_PROVIDER");
    }

    const [updated] = await db
      .update(users)
      .set({
        authProvider: provider,
        authProviderId: providerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingByEmail.id))
      .returning();
    return updated;
  }

  const [newUser] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      authProvider: provider,
      authProviderId: providerId,
      name: name || "",
    })
    .returning();

  return newUser;
}
