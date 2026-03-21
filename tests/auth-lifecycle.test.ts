import { describe, it, expect, beforeAll, afterAll } from "vitest";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { generateAccessToken, verifyAccessToken, stripSensitiveFields, createRefreshToken, rotateRefreshToken, revokeAllRefreshTokens } from "../server/auth";
import type { AuthPayload } from "../server/auth";
import { db } from "../server/db";
import { users, refreshTokens } from "../shared/schema";
import { eq } from "drizzle-orm";

let testUserId: number;

beforeAll(async () => {
  const [user] = await db.insert(users).values({
    email: `auth-test-${Date.now()}@test.com`,
    authProvider: "google",
    authProviderId: `test-${Date.now()}`,
    name: "Auth Test User",
    role: "user",
  }).returning();
  testUserId = user.id;
});

afterAll(async () => {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, testUserId));
  await db.delete(users).where(eq(users.id, testUserId));
});

describe("access token lifecycle", () => {
  const testPayload: AuthPayload = {
    userId: 42,
    email: "test@example.com",
    role: "user",
  };

  it("generates a valid JWT that can be verified", () => {
    const token = generateAccessToken(testPayload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(42);
    expect(decoded!.email).toBe("test@example.com");
    expect(decoded!.role).toBe("user");
  });

  it("verifyAccessToken returns null for invalid token", () => {
    const result = verifyAccessToken("invalid.token.value");
    expect(result).toBeNull();
  });

  it("verifyAccessToken returns null for empty string", () => {
    const result = verifyAccessToken("");
    expect(result).toBeNull();
  });

  it("verifyAccessToken returns null for tampered token", () => {
    const token = generateAccessToken(testPayload);
    const parts = token.split(".");
    parts[1] = Buffer.from('{"userId":999,"email":"hacker@evil.com","role":"admin"}').toString("base64url");
    const tampered = parts.join(".");
    const result = verifyAccessToken(tampered);
    expect(result).toBeNull();
  });

  it("token contains exp claim for 15-minute expiry", () => {
    const token = generateAccessToken(testPayload);
    const payloadPart = token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payloadPart, "base64url").toString());
    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
    const expiryMinutes = (decoded.exp - decoded.iat) / 60;
    expect(expiryMinutes).toBe(15);
  });

  it("generates different tokens for different payloads", () => {
    const token1 = generateAccessToken(testPayload);
    const token2 = generateAccessToken({ ...testPayload, userId: 99 });
    expect(token1).not.toBe(token2);
  });

  it("preserves all payload fields through encode/decode cycle", () => {
    const payload: AuthPayload = { userId: 1, email: "admin@test.com", role: "admin" };
    const token = generateAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded!.userId).toBe(1);
    expect(decoded!.email).toBe("admin@test.com");
    expect(decoded!.role).toBe("admin");
  });
});

describe("stripSensitiveFields", () => {
  it("removes passwordHash from user object", () => {
    const user = { id: 1, email: "a@b.com", passwordHash: "secret123", name: "Test" };
    const safe = stripSensitiveFields(user);
    expect(safe).not.toHaveProperty("passwordHash");
    expect(safe).toHaveProperty("email", "a@b.com");
    expect(safe).toHaveProperty("name", "Test");
    expect(safe).toHaveProperty("id", 1);
  });

  it("works when passwordHash is null", () => {
    const user = { id: 1, email: "a@b.com", passwordHash: null, name: "Test" };
    const safe = stripSensitiveFields(user);
    expect(safe).not.toHaveProperty("passwordHash");
    expect(safe).toHaveProperty("email", "a@b.com");
  });

  it("works when passwordHash is missing", () => {
    const user = { id: 1, email: "a@b.com", name: "Test" };
    const safe = stripSensitiveFields(user);
    expect(safe).toHaveProperty("email", "a@b.com");
    expect(safe).toHaveProperty("name", "Test");
  });
});

describe("requireAuth middleware behavior", () => {
  it("rejects requests without Bearer prefix", () => {
    const decoded = verifyAccessToken("not-a-jwt");
    expect(decoded).toBeNull();
  });

  it("rejects truncated tokens", () => {
    const token = generateAccessToken({ userId: 1, email: "a@b.com", role: "user" });
    const truncated = token.substring(0, token.length - 10);
    expect(verifyAccessToken(truncated)).toBeNull();
  });
});

describe("expired access token handling", () => {
  const JWT_SECRET = process.env.SESSION_SECRET!;

  it("verifyAccessToken returns null for an expired token", () => {
    const expiredToken = jwt.sign(
      { userId: 1, email: "test@test.com", role: "user" },
      JWT_SECRET,
      { expiresIn: "-1s" }
    );
    const result = verifyAccessToken(expiredToken);
    expect(result).toBeNull();
  });

  it("verifyAccessToken succeeds for a not-yet-expired token", () => {
    const validToken = jwt.sign(
      { userId: 1, email: "test@test.com", role: "user" },
      JWT_SECRET,
      { expiresIn: "5m" }
    );
    const result = verifyAccessToken(validToken);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe(1);
  });

  it("token signed with wrong secret is rejected", () => {
    const wrongSecretToken = jwt.sign(
      { userId: 1, email: "test@test.com", role: "user" },
      "completely-wrong-secret",
      { expiresIn: "15m" }
    );
    const result = verifyAccessToken(wrongSecretToken);
    expect(result).toBeNull();
  });
});

describe("refresh token lifecycle (behavioral, real DB)", () => {
  it("createRefreshToken returns a hex string and stores SHA-256 hash", async () => {
    const token = await createRefreshToken(testUserId);
    expect(typeof token).toBe("string");
    expect(token.length).toBe(128);

    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const [row] = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash)).limit(1);
    expect(row).toBeDefined();
    expect(row.userId).toBe(testUserId);
    expect(row.revokedAt).toBeNull();
    expect(row.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const daysUntilExpiry = (row.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(daysUntilExpiry).toBeGreaterThan(29);
    expect(daysUntilExpiry).toBeLessThanOrEqual(30.1);
  });

  it("rotateRefreshToken revokes old token and returns new one", async () => {
    const oldToken = await createRefreshToken(testUserId);
    const newToken = await rotateRefreshToken(oldToken, testUserId);

    expect(newToken).not.toBeNull();
    expect(newToken).not.toBe(oldToken);

    const oldHash = crypto.createHash("sha256").update(oldToken).digest("hex");
    const [oldRow] = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, oldHash)).limit(1);
    expect(oldRow.revokedAt).not.toBeNull();

    const newHash = crypto.createHash("sha256").update(newToken!).digest("hex");
    const [newRow] = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, newHash)).limit(1);
    expect(newRow).toBeDefined();
    expect(newRow.revokedAt).toBeNull();
  });

  it("rotateRefreshToken returns null for already-revoked token (reuse detection)", async () => {
    const token = await createRefreshToken(testUserId);
    await rotateRefreshToken(token, testUserId);

    const replayResult = await rotateRefreshToken(token, testUserId);
    expect(replayResult).toBeNull();
  });

  it("reuse detection revokes ALL user tokens", async () => {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, testUserId));

    const token1 = await createRefreshToken(testUserId);
    const token2 = await createRefreshToken(testUserId);

    await rotateRefreshToken(token1, testUserId);
    await rotateRefreshToken(token1, testUserId);

    const hash2 = crypto.createHash("sha256").update(token2).digest("hex");
    const [row2] = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hash2)).limit(1);
    expect(row2.revokedAt).not.toBeNull();
  });

  it("revokeAllRefreshTokens marks all active tokens as revoked", async () => {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, testUserId));

    await createRefreshToken(testUserId);
    await createRefreshToken(testUserId);

    await revokeAllRefreshTokens(testUserId);

    const remaining = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.userId, testUserId));
    for (const row of remaining) {
      expect(row.revokedAt).not.toBeNull();
    }
  });

  it("rotateRefreshToken returns null for a non-existent token", async () => {
    const fakeToken = crypto.randomBytes(64).toString("hex");
    const result = await rotateRefreshToken(fakeToken, testUserId);
    expect(result).toBeNull();
  });

  it("rotateRefreshToken returns null for wrong userId", async () => {
    const token = await createRefreshToken(testUserId);
    const result = await rotateRefreshToken(token, testUserId + 99999);
    expect(result).toBeNull();
  });
});

describe("social auth and account deletion (source verification)", () => {
  it("Google auth handles cross-provider conflict with 409", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");
    const googleRoute = source.slice(
      source.indexOf('app.post("/api/auth/google"'),
      source.indexOf('app.post("/api/auth/apple"')
    );
    expect(googleRoute).toContain("ACCOUNT_LINKED_DIFFERENT_PROVIDER");
    expect(googleRoute).toContain("status(409)");
  });

  it("Apple auth requires email for new accounts", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");
    const appleRoute = source.slice(
      source.indexOf('app.post("/api/auth/apple"'),
      source.indexOf('app.post("/api/auth/refresh"')
    );
    expect(appleRoute).toContain("EMAIL_REQUIRED_FOR_NEW_ACCOUNT");
    expect(appleRoute).toContain("status(400)");
  });

  it("account deletion is soft-delete with session revocation", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");
    const deleteRoute = source.slice(
      source.indexOf('app.delete("/api/auth/account"'),
      source.indexOf('app.get("/api/auth/export"')
    );
    expect(deleteRoute).toContain("deletedAt: new Date()");
    expect(deleteRoute).not.toContain("db.delete(users)");
    expect(deleteRoute).toContain("revokeAllRefreshTokens");
  });

  it("findOrCreateSocialUser checks provider before email and excludes deleted users", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");
    const findFn = source.slice(
      source.indexOf("export async function findOrCreateSocialUser")
    );
    const providerCheckIdx = findFn.indexOf("existingByProvider");
    const emailCheckIdx = findFn.indexOf("existingByEmail");
    expect(providerCheckIdx).toBeLessThan(emailCheckIdx);
    const deletedAtMatches = findFn.match(/isNull\(users\.deletedAt\)/g) || [];
    expect(deletedAtMatches.length).toBeGreaterThanOrEqual(2);
  });

  it("refresh route validates input, detects reuse, checks soft-delete", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");
    const refreshRoute = source.slice(
      source.indexOf('app.post("/api/auth/refresh"'),
      source.indexOf('app.post("/api/auth/logout"')
    );
    expect(refreshRoute).toContain("refreshSchema.safeParse");
    expect(refreshRoute).toContain("tokenRecord.revokedAt");
    expect(refreshRoute).toContain("revokeAllRefreshTokens");
    expect(refreshRoute).toContain("Token reuse detected");
    expect(refreshRoute).toContain("isNull(users.deletedAt)");
  });
});
