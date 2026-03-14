import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, refreshTokens, emailVerificationTokens, passwordResetTokens } from "@shared/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
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

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
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

const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;
const RESET_TOKEN_EXPIRY_HOURS = 1;

export async function createEmailVerificationToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + VERIFICATION_TOKEN_EXPIRY_HOURS);

  await db.insert(emailVerificationTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  if (process.env.NODE_ENV === "development") {
    logger.info("Email verification token (dev only)", { userId, token });
  }

  return token;
}

export async function verifyEmailToken(token: string): Promise<number | null> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [record] = await db
    .select()
    .from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokens.id, record.id));

  await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(eq(users.id, record.userId));

  return record.userId;
}

export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRY_HOURS);

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  if (process.env.NODE_ENV === "development") {
    logger.info("Password reset token (dev only)", { userId, token });
  }

  return token;
}

export async function verifyPasswordResetToken(token: string): Promise<number | null> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, record.id));

  return record.userId;
}
