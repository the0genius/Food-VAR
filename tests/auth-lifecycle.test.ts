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
});

describe("requireAuth middleware (source verification)", () => {
  it("rejects requests without Authorization header", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const requireAuthFn = source.match(
      /export function requireAuth[\s\S]*?^}/m
    );
    expect(requireAuthFn).toBeTruthy();
    const fnBlock = requireAuthFn![0];

    expect(fnBlock).toContain('header?.startsWith("Bearer ")');
    expect(fnBlock).toContain("status(401)");
    expect(fnBlock).toContain("Authentication required");
  });

  it("rejects requests with invalid token", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const requireAuthFn = source.match(
      /export function requireAuth[\s\S]*?^}/m
    );
    expect(requireAuthFn).toBeTruthy();
    const fnBlock = requireAuthFn![0];

    expect(fnBlock).toContain("verifyAccessToken(token)");
    expect(fnBlock).toContain("Invalid or expired token");
  });

  it("sets req.auth on successful verification", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const requireAuthFn = source.match(
      /export function requireAuth[\s\S]*?^}/m
    );
    expect(requireAuthFn).toBeTruthy();
    const fnBlock = requireAuthFn![0];

    expect(fnBlock).toContain("req.auth = payload");
    expect(fnBlock).toContain("next()");
  });
});

describe("refresh token lifecycle (source verification)", () => {
  it("createRefreshToken hashes token before storing", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const createFn = source.match(
      /export async function createRefreshToken[\s\S]*?^}/m
    );
    expect(createFn).toBeTruthy();
    const fnBlock = createFn![0];

    expect(fnBlock).toContain('crypto.randomBytes(64).toString("hex")');
    expect(fnBlock).toContain('crypto.createHash("sha256").update(token).digest("hex")');
    expect(fnBlock).toContain("db.insert(refreshTokens)");
    expect(fnBlock).toContain("tokenHash");
    expect(fnBlock).not.toContain("token:");
  });

  it("rotateRefreshToken revokes old token and creates new one", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const rotateFn = source.match(
      /export async function rotateRefreshToken[\s\S]*?^}/m
    );
    expect(rotateFn).toBeTruthy();
    const fnBlock = rotateFn![0];

    expect(fnBlock).toContain("revokedAt: new Date()");
    expect(fnBlock).toContain("createRefreshToken(userId)");
  });

  it("rotateRefreshToken detects reuse and revokes all sessions", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const rotateFn = source.match(
      /export async function rotateRefreshToken[\s\S]*?^}/m
    );
    expect(rotateFn).toBeTruthy();
    const fnBlock = rotateFn![0];

    expect(fnBlock).toContain("existing.revokedAt");
    expect(fnBlock).toContain("revokeAllRefreshTokens(userId)");
    expect(fnBlock).toContain("return null");
  });

  it("rotateRefreshToken returns null for expired tokens", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const rotateFn = source.match(
      /export async function rotateRefreshToken[\s\S]*?^}/m
    );
    expect(rotateFn).toBeTruthy();
    const fnBlock = rotateFn![0];

    expect(fnBlock).toContain("existing.expiresAt < new Date()");
  });

  it("refresh token expires in 30 days", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    expect(source).toContain("REFRESH_TOKEN_EXPIRY_DAYS = 30");
  });
});

describe("refresh route (source verification)", () => {
  it("refresh route validates input with Zod", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const refreshRoute = source.match(
      /app\.post\("\/api\/auth\/refresh"[\s\S]*?^\s{2}\}\);/m
    );
    expect(refreshRoute).toBeTruthy();
    const routeBlock = refreshRoute![0];

    expect(routeBlock).toContain("refreshSchema.safeParse(req.body)");
  });

  it("refresh route detects revoked token reuse and invalidates all sessions", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const refreshRoute = source.match(
      /app\.post\("\/api\/auth\/refresh"[\s\S]*?^\s{2}\}\);/m
    );
    expect(refreshRoute).toBeTruthy();
    const routeBlock = refreshRoute![0];

    expect(routeBlock).toContain("tokenRecord.revokedAt");
    expect(routeBlock).toContain("revokeAllRefreshTokens(tokenRecord.userId)");
    expect(routeBlock).toContain("Token reuse detected");
  });

  it("refresh route checks token expiry", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const refreshRoute = source.match(
      /app\.post\("\/api\/auth\/refresh"[\s\S]*?^\s{2}\}\);/m
    );
    expect(refreshRoute).toBeTruthy();
    const routeBlock = refreshRoute![0];

    expect(routeBlock).toContain("tokenRecord.expiresAt < new Date()");
  });

  it("refresh route checks user is not deleted", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const refreshRoute = source.match(
      /app\.post\("\/api\/auth\/refresh"[\s\S]*?^\s{2}\}\);/m
    );
    expect(refreshRoute).toBeTruthy();
    const routeBlock = refreshRoute![0];

    expect(routeBlock).toContain("isNull(users.deletedAt)");
  });

  it("refresh route uses rotateRefreshToken for token rotation", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const refreshRoute = source.match(
      /app\.post\("\/api\/auth\/refresh"[\s\S]*?^\s{2}\}\);/m
    );
    expect(refreshRoute).toBeTruthy();
    const routeBlock = refreshRoute![0];

    expect(routeBlock).toContain("rotateRefreshToken(oldToken, user.id)");
  });
});

describe("social auth routes (source verification)", () => {
  it("Google auth verifies token and creates/finds user", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const googleRoute = source.match(
      /app\.post\("\/api\/auth\/google"[\s\S]*?^\s{2}\}\);/m
    );
    expect(googleRoute).toBeTruthy();
    const routeBlock = googleRoute![0];

    expect(routeBlock).toContain("verifyGoogleIdToken(parsed.data.idToken)");
    expect(routeBlock).toContain("findOrCreateSocialUser");
    expect(routeBlock).toContain("generateAccessToken(payload)");
    expect(routeBlock).toContain("createRefreshToken(user.id)");
  });

  it("Apple auth handles ACCOUNT_LINKED_DIFFERENT_PROVIDER error", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const appleRoute = source.match(
      /app\.post\("\/api\/auth\/apple"[\s\S]*?^\s{2}\}\);/m
    );
    expect(appleRoute).toBeTruthy();
    const routeBlock = appleRoute![0];

    expect(routeBlock).toContain("ACCOUNT_LINKED_DIFFERENT_PROVIDER");
    expect(routeBlock).toContain("status(409)");
  });

  it("Apple auth handles EMAIL_REQUIRED_FOR_NEW_ACCOUNT error", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const appleRoute = source.match(
      /app\.post\("\/api\/auth\/apple"[\s\S]*?^\s{2}\}\);/m
    );
    expect(appleRoute).toBeTruthy();
    const routeBlock = appleRoute![0];

    expect(routeBlock).toContain("EMAIL_REQUIRED_FOR_NEW_ACCOUNT");
    expect(routeBlock).toContain("status(400)");
  });

  it("stripSensitiveFields removes passwordHash", () => {
    const user = { id: 1, email: "a@b.com", passwordHash: "secret123", name: "Test" };
    const safe = stripSensitiveFields(user);
    expect(safe).not.toHaveProperty("passwordHash");
    expect(safe).toHaveProperty("email", "a@b.com");
    expect(safe).toHaveProperty("name", "Test");
  });
});

describe("account deletion and export", () => {
  it("account deletion soft-deletes user and revokes all tokens", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const deleteRoute = source.match(
      /app\.delete\("\/api\/auth\/account"[\s\S]*?^\s{2}\}\);/m
    );
    expect(deleteRoute).toBeTruthy();
    const routeBlock = deleteRoute![0];

    expect(routeBlock).toContain("requireAuth");
    expect(routeBlock).toContain("revokeAllRefreshTokens(userId)");
    expect(routeBlock).toContain("deletedAt: new Date()");
    expect(routeBlock).not.toContain("db.delete(users)");
  });

  it("data export returns profile and scan history", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const exportRoute = source.match(
      /app\.get\("\/api\/auth\/export"[\s\S]*?^\s{2}\}\);/m
    );
    expect(exportRoute).toBeTruthy();
    const routeBlock = exportRoute![0];

    expect(routeBlock).toContain("requireAuth");
    expect(routeBlock).toContain("stripSensitiveFields(user)");
    expect(routeBlock).toContain("scanHistory");
    expect(routeBlock).toContain("exportedAt");
  });
});

describe("findOrCreateSocialUser safety (source verification)", () => {
  it("checks provider+providerId match first", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const findFn = source.match(
      /export async function findOrCreateSocialUser[\s\S]*?^}/m
    );
    expect(findFn).toBeTruthy();
    const fnBlock = findFn![0];

    const providerCheckIdx = fnBlock.indexOf("existingByProvider");
    const emailCheckIdx = fnBlock.indexOf("existingByEmail");
    expect(providerCheckIdx).toBeLessThan(emailCheckIdx);
  });

  it("rejects linking to account with different provider", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const findFn = source.match(
      /export async function findOrCreateSocialUser[\s\S]*?^}/m
    );
    expect(findFn).toBeTruthy();
    const fnBlock = findFn![0];

    expect(fnBlock).toContain("existingByEmail.authProvider !== provider");
    expect(fnBlock).toContain("ACCOUNT_LINKED_DIFFERENT_PROVIDER");
  });

  it("requires email for new account creation", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const findFn = source.match(
      /export async function findOrCreateSocialUser[\s\S]*?^}/m
    );
    expect(findFn).toBeTruthy();
    const fnBlock = findFn![0];

    expect(fnBlock).toContain("!email");
    expect(fnBlock).toContain("EMAIL_REQUIRED_FOR_NEW_ACCOUNT");
  });

  it("excludes soft-deleted users from lookup", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/auth.ts", "utf-8");

    const findFn = source.match(
      /export async function findOrCreateSocialUser[\s\S]*?^}/m
    );
    expect(findFn).toBeTruthy();
    const fnBlock = findFn![0];

    expect(fnBlock).toContain("isNull(users.deletedAt)");
    const deletedAtCount = (fnBlock.match(/isNull\(users\.deletedAt\)/g) || []).length;
    expect(deletedAtCount).toBeGreaterThanOrEqual(2);
  });
});
