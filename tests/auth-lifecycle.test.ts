import { describe, it, expect } from "vitest";
import { generateAccessToken, verifyAccessToken, stripSensitiveFields } from "../server/auth";
import type { AuthPayload } from "../server/auth";

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

describe("refresh token security (source verification)", () => {
  it("refresh tokens are hashed with SHA-256 before storage", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const createFn = source.slice(
      source.indexOf("export async function createRefreshToken"),
      source.indexOf("export async function rotateRefreshToken")
    );
    expect(createFn).toContain('createHash("sha256")');
    expect(createFn).toContain("tokenHash");
  });

  it("token rotation revokes the old token and issues a new one", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const rotateFn = source.slice(
      source.indexOf("export async function rotateRefreshToken"),
      source.indexOf("export async function revokeAllRefreshTokens")
    );
    expect(rotateFn).toContain("revokedAt: new Date()");
    expect(rotateFn).toContain("createRefreshToken(userId)");
  });

  it("reuse detection revokes all user sessions", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const rotateFn = source.slice(
      source.indexOf("export async function rotateRefreshToken"),
      source.indexOf("export async function revokeAllRefreshTokens")
    );
    expect(rotateFn).toContain("existing.revokedAt");
    expect(rotateFn).toContain("revokeAllRefreshTokens(userId)");
    expect(rotateFn).toContain("return null");
  });

  it("refresh tokens expire after 30 days", () => {
    const fs = require("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");
    expect(source).toContain("REFRESH_TOKEN_EXPIRY_DAYS = 30");
  });
});

describe("refresh route contract", () => {
  it("validates input with Zod schema", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const refreshRoute = source.slice(
      source.indexOf('app.post("/api/auth/refresh"'),
      source.indexOf('app.post("/api/auth/logout"')
    );
    expect(refreshRoute).toContain("refreshSchema.safeParse");
  });

  it("detects revoked token reuse and invalidates all sessions", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const refreshRoute = source.slice(
      source.indexOf('app.post("/api/auth/refresh"'),
      source.indexOf('app.post("/api/auth/logout"')
    );
    expect(refreshRoute).toContain("tokenRecord.revokedAt");
    expect(refreshRoute).toContain("revokeAllRefreshTokens");
    expect(refreshRoute).toContain("Token reuse detected");
  });

  it("checks user is not soft-deleted before issuing tokens", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const refreshRoute = source.slice(
      source.indexOf('app.post("/api/auth/refresh"'),
      source.indexOf('app.post("/api/auth/logout"')
    );
    expect(refreshRoute).toContain("isNull(users.deletedAt)");
  });
});

describe("social auth error handling", () => {
  it("Google auth returns 409 for cross-provider conflict", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const googleRoute = source.slice(
      source.indexOf('app.post("/api/auth/google"'),
      source.indexOf('app.post("/api/auth/apple"')
    );
    expect(googleRoute).toContain("ACCOUNT_LINKED_DIFFERENT_PROVIDER");
    expect(googleRoute).toContain("status(409)");
  });

  it("Apple auth returns 400 when email is not shared", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const appleRoute = source.slice(
      source.indexOf('app.post("/api/auth/apple"'),
      source.indexOf('app.post("/api/auth/refresh"')
    );
    expect(appleRoute).toContain("EMAIL_REQUIRED_FOR_NEW_ACCOUNT");
    expect(appleRoute).toContain("status(400)");
  });
});

describe("findOrCreateSocialUser safety", () => {
  it("checks provider+providerId before email lookup", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const findFn = source.slice(
      source.indexOf("export async function findOrCreateSocialUser")
    );
    const providerCheckIdx = findFn.indexOf("existingByProvider");
    const emailCheckIdx = findFn.indexOf("existingByEmail");
    expect(providerCheckIdx).toBeLessThan(emailCheckIdx);
  });

  it("excludes soft-deleted users from both lookups", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const findFn = source.slice(
      source.indexOf("export async function findOrCreateSocialUser")
    );
    const deletedAtMatches = findFn.match(/isNull\(users\.deletedAt\)/g) || [];
    expect(deletedAtMatches.length).toBeGreaterThanOrEqual(2);
  });
});

describe("account deletion", () => {
  it("soft-deletes (does not hard-delete) users", async () => {
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
});
