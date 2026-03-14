import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import {
  users,
  products,
  scanHistory,
  dailyScanTracker,
} from "@shared/schema";
import { eq, and, ilike, or, desc, sql, asc, ne, isNull } from "drizzle-orm";
import { computeScore, computeClusterId, getScoreLabel, SCORING_VERSION } from "./scoring-engine";
import { getAdvice, getDeterministicAdvice, extractNutritionFromImages } from "./ai-advice";
import { isFeatureEnabled } from "./feature-flags";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeAllRefreshTokens,
  requireAuth,
  stripSensitiveFields,
  type AuthPayload,
} from "./auth";
import { z } from "zod";

function paramId(req: Request, name: string = "id"): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

import { logger } from "./logger";

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().max(100).optional().default(""),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const profileSchema = z.object({
  name: z.string().max(100).optional(),
  age: z.number().int().min(1).max(150).nullable().optional(),
  gender: z.string().max(50).optional(),
  heightCm: z.number().min(30).max(300).nullable().optional(),
  weightKg: z.number().min(10).max(500).nullable().optional(),
  conditions: z.array(z.string().max(100)).max(50).optional(),
  conditionsOther: z.string().max(500).nullable().optional(),
  allergies: z.array(z.string().max(100)).max(50).optional(),
  allergiesOther: z.string().max(500).nullable().optional(),
  dietaryPreference: z.string().max(50).nullable().optional(),
  goal: z.string().max(50).nullable().optional(),
  onboardingCompleted: z.boolean().optional(),
  consentPolicyVersion: z.string().max(20).optional(),
  consentAiVersion: z.string().max(20).optional(),
  consentAcceptedAt: z.string().datetime().optional(),
});

const scoreSchema = z.object({
  productId: z.number().int().positive(),
  accessMethod: z.enum(["scan", "browse", "search"]).optional().default("scan"),
});

const contributeSchema = z.object({
  barcode: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  brand: z.string().max(255).optional().default(""),
  category: z.string().max(100).optional().default(""),
  servingSize: z.string().max(100).nullable().optional(),
  calories: z.number().min(0).max(99999).nullable().optional(),
  protein: z.number().min(0).max(99999).nullable().optional(),
  carbohydrates: z.number().min(0).max(99999).nullable().optional(),
  sugar: z.number().min(0).max(99999).nullable().optional(),
  fat: z.number().min(0).max(99999).nullable().optional(),
  saturatedFat: z.number().min(0).max(99999).nullable().optional(),
  fiber: z.number().min(0).max(99999).nullable().optional(),
  sodium: z.number().min(0).max(99999).nullable().optional(),
  allergens: z.array(z.string().max(100)).max(50).optional(),
  declaredAllergens: z.array(z.string().max(100)).max(50).optional(),
  inferredAllergens: z.array(z.string().max(100)).max(50).optional(),
  ingredients: z.string().max(5000).nullable().optional(),
  nutritionFacts: z.string().max(5000).nullable().optional(),
});

const extractSchema = z.object({
  frontImage: z.string().min(1),
  backImage: z.string().min(1),
});

const moderateSchema = z.object({
  action: z.enum(["approve", "reject", "flag"]),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const searchQuerySchema = z.object({
  q: z.string().max(200).optional().default(""),
  category: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const historyQuerySchema = z.object({
  sort: z.enum(["date", "score_high", "score_low"]).optional().default("date"),
  search: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

function zodError(res: Response, parsed: z.SafeParseError<unknown>) {
  return res.status(400).json({
    error: "Validation failed",
    details: parsed.error.flatten().fieldErrors,
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", (_req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    next();
  });

  // ========== AUTH ROUTES ==========
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { email, password, name } = parsed.data;

      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existing) {
        return res.status(409).json({ error: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      const [user] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          passwordHash,
          name: name || "",
        })
        .returning();

      const payload: AuthPayload = {
        userId: user.id,
        email: user.email,
        role: user.role || "user",
      };
      const accessToken = generateAccessToken(payload);
      const refreshToken = await createRefreshToken(user.id);

      res.status(201).json({
        user: stripSensitiveFields(user),
        accessToken,
        refreshToken,
      });
    } catch (error) {
      logger.error("Registration failed", error, {}, req);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { email, password } = parsed.data;

      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.email, email.toLowerCase()),
            isNull(users.deletedAt)
          )
        )
        .limit(1);

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const payload: AuthPayload = {
        userId: user.id,
        email: user.email,
        role: user.role || "user",
      };
      const accessToken = generateAccessToken(payload);
      const refreshToken = await createRefreshToken(user.id);

      res.json({
        user: stripSensitiveFields(user),
        accessToken,
        refreshToken,
      });
    } catch (error) {
      logger.error("Login failed", error, {}, req);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/refresh", async (req: Request, res: Response) => {
    try {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Refresh token required" });
      }

      const { refreshToken: oldToken } = parsed.data;

      const crypto = await import("crypto");
      const oldHash = crypto
        .createHash("sha256")
        .update(oldToken)
        .digest("hex");

      const { refreshTokens } = await import("@shared/schema");
      const [tokenRecord] = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.tokenHash, oldHash),
            isNull(refreshTokens.revokedAt)
          )
        )
        .limit(1);

      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        return res.status(401).json({ error: "Invalid or expired refresh token" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(
          and(eq(users.id, tokenRecord.userId), isNull(users.deletedAt))
        )
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const newRefreshToken = await rotateRefreshToken(oldToken, user.id);
      if (!newRefreshToken) {
        return res.status(401).json({ error: "Token rotation failed" });
      }

      const payload: AuthPayload = {
        userId: user.id,
        email: user.email,
        role: user.role || "user",
      };
      const accessToken = generateAccessToken(payload);

      res.json({
        user: stripSensitiveFields(user),
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      logger.error("Token refresh failed", error, {}, req);
      res.status(500).json({ error: "Token refresh failed" });
    }
  });

  app.post("/api/auth/logout", requireAuth, async (req: Request, res: Response) => {
    try {
      await revokeAllRefreshTokens(req.auth!.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Logout failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: Request, res: Response) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(eq(users.id, req.auth!.userId), isNull(users.deletedAt))
        )
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(stripSensitiveFields(user));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.delete("/api/auth/account", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.auth!.userId;
      await revokeAllRefreshTokens(userId);
      await db
        .update(users)
        .set({
          deletedAt: new Date(),
          email: sql`${users.email} || '_deleted_' || ${users.id}`,
        })
        .where(eq(users.id, userId));

      res.json({ success: true });
    } catch (error) {
      logger.error("Account deletion failed", error, {}, req);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.get("/api/auth/export", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.auth!.userId;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      const history = await db
        .select({
          id: scanHistory.id,
          productId: scanHistory.productId,
          score: scanHistory.score,
          adviceText: scanHistory.adviceText,
          headline: scanHistory.headline,
          highlights: scanHistory.highlights,
          accessMethod: scanHistory.accessMethod,
          createdAt: scanHistory.createdAt,
          productName: products.name,
          productBrand: products.brand,
          productBarcode: products.barcode,
        })
        .from(scanHistory)
        .innerJoin(products, eq(scanHistory.productId, products.id))
        .where(eq(scanHistory.userId, userId))
        .orderBy(desc(scanHistory.createdAt));

      res.json({
        profile: user ? stripSensitiveFields(user) : null,
        scanHistory: history,
        exportedAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  // ========== USER PROFILE (AUTHENTICATED) ==========
  app.put("/api/users/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = profileSchema.safeParse(req.body);
      if (!parsed.success) return zodError(res, parsed);

      const userId = req.auth!.userId;
      const {
        name,
        age,
        gender,
        heightCm,
        weightKg,
        conditions,
        conditionsOther,
        allergies,
        allergiesOther,
        dietaryPreference,
        goal,
        onboardingCompleted,
        consentPolicyVersion,
        consentAiVersion,
        consentAcceptedAt,
      } = parsed.data;

      const clusterId = computeClusterId({
        conditions,
        allergies,
        dietaryPreference,
        goal,
      });

      const [updated] = await db
        .update(users)
        .set({
          name,
          age,
          gender,
          heightCm,
          weightKg,
          conditions,
          conditionsOther,
          allergies,
          allergiesOther,
          dietaryPreference,
          goal,
          onboardingCompleted:
            onboardingCompleted !== undefined ? onboardingCompleted : true,
          profileClusterId: clusterId,
          updatedAt: new Date(),
          ...(consentPolicyVersion !== undefined && { consentPolicyVersion }),
          ...(consentAiVersion !== undefined && { consentAiVersion }),
          ...(consentAcceptedAt !== undefined && { consentAcceptedAt: new Date(consentAcceptedAt) }),
        })
        .where(eq(users.id, userId))
        .returning();

      res.json(stripSensitiveFields(updated));
    } catch (error) {
      logger.error("Profile update failed", error, {}, req);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // ========== PRODUCTS (PUBLIC) ==========
  app.get("/api/products/barcode/:barcode", async (req: Request, res: Response) => {
    try {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.barcode, paramId(req, "barcode")));
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  app.get("/api/products/search", async (req: Request, res: Response) => {
    try {
      const parsed = searchQuerySchema.safeParse(req.query);
      if (!parsed.success) return zodError(res, parsed);
      const { q: query, category, limit } = parsed.data;

      let conditions: any[] = [];
      if (query.length >= 2) {
        const searchTerm = `%${query}%`;
        conditions.push(
          or(
            ilike(products.name, searchTerm),
            ilike(products.brand, searchTerm),
            ilike(products.category, searchTerm)
          )
        );
      }
      if (category) {
        conditions.push(ilike(products.category, category));
      }

      if (!isFeatureEnabled("EXPOSE_UNVERIFIED_PRODUCTS")) {
        conditions.push(ne(products.moderationStatus, "pending"));
      }

      const result = await db
        .select()
        .from(products)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(products.scanCount))
        .limit(limit);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to search products" });
    }
  });

  app.get("/api/products/popular", async (req: Request, res: Response) => {
    try {
      const where = isFeatureEnabled("EXPOSE_UNVERIFIED_PRODUCTS")
        ? undefined
        : ne(products.moderationStatus, "pending");

      const result = await db
        .select()
        .from(products)
        .where(where)
        .orderBy(desc(products.scanCount))
        .limit(10);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch popular products" });
    }
  });

  app.get("/api/products/categories", async (_req: Request, res: Response) => {
    try {
      const result = await db
        .selectDistinct({ category: products.category })
        .from(products)
        .where(sql`${products.category} IS NOT NULL AND ${products.category} != ''`);
      res.json(result.map((r) => r.category).filter(Boolean));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/products/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(paramId(req));
      const [product] = await db.select().from(products).where(eq(products.id, id));
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // ========== SCORING & ADVICE (AUTHENTICATED) ==========
  app.post("/api/score", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = scoreSchema.safeParse(req.body);
      if (!parsed.success) return zodError(res, parsed);

      const userId = req.auth!.userId;
      const { productId, accessMethod } = parsed.data;

      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ error: "User not found" });

      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId));
      if (!product) return res.status(404).json({ error: "Product not found" });

      const today = new Date().toISOString().split("T")[0];

      if (!user.isPro) {
        const existingToday = await db
          .select()
          .from(dailyScanTracker)
          .where(
            and(
              eq(dailyScanTracker.userId, userId),
              eq(dailyScanTracker.productId, productId),
              eq(dailyScanTracker.scanDate, today)
            )
          )
          .limit(1);

        if (existingToday.length === 0) {
          const todayScans = await db
            .select({ count: sql<number>`count(*)` })
            .from(dailyScanTracker)
            .where(
              and(
                eq(dailyScanTracker.userId, userId),
                eq(dailyScanTracker.scanDate, today)
              )
            );

          const scanCount = Number(todayScans[0]?.count || 0);
          if (scanCount >= 10) {
            return res.status(429).json({
              error: "daily_limit_reached",
              message:
                "You've used your 10 free checks today! Upgrade to Pro for unlimited access.",
              scansUsed: scanCount,
              limit: 10,
            });
          }
        }
      }

      const scoreResult = await computeScore(product, user);
      const clusterId = user.profileClusterId || computeClusterId(user);

      let adviceResult;
      if (isFeatureEnabled("ENABLE_AI_ADVICE")) {
        adviceResult = await getAdvice(
          product,
          user,
          scoreResult.score,
          scoreResult.label,
          clusterId,
          scoreResult.isAllergenAlert,
          scoreResult.matchedAllergens,
          scoreResult.deductions
        );
      } else {
        adviceResult = getDeterministicAdvice(
          scoreResult.score,
          scoreResult.label,
          scoreResult.isAllergenAlert,
          scoreResult.matchedAllergens,
          scoreResult.deductions
        );
      }

      try {
        await db
          .insert(dailyScanTracker)
          .values({
            userId,
            productId,
            scanDate: today,
          })
          .onConflictDoNothing();
      } catch {}

      const [historyEntry] = await db
        .insert(scanHistory)
        .values({
          userId,
          productId,
          score: scoreResult.score,
          adviceText: adviceResult.advice,
          headline: adviceResult.headline || "",
          coachTip: adviceResult.coachTip || "",
          highlights: adviceResult.highlights,
          profileClusterId: clusterId,
          scoringVersion: SCORING_VERSION,
          accessMethod: accessMethod || "scan",
        })
        .returning();

      await db
        .update(products)
        .set({ scanCount: sql`${products.scanCount} + 1` })
        .where(eq(products.id, productId));

      res.json({
        score: scoreResult.score,
        label: scoreResult.label,
        isAllergenAlert: scoreResult.isAllergenAlert,
        matchedAllergens: scoreResult.matchedAllergens,
        advice: adviceResult.advice,
        headline: adviceResult.headline,
        coachTip: adviceResult.coachTip,
        highlights: adviceResult.highlights,
        adviceFromCache: adviceResult.fromCache,
        deductions: scoreResult.deductions,
        scoringVersion: SCORING_VERSION,
        product,
        historyId: historyEntry.id,
      });
    } catch (error) {
      logger.error("Score computation failed", error, {}, req);
      res.status(500).json({ error: "Failed to compute score" });
    }
  });

  // ========== CONTRIBUTION (AUTHENTICATED) ==========
  app.post("/api/products/contribute", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = contributeSchema.safeParse(req.body);
      if (!parsed.success) return zodError(res, parsed);

      const userId = req.auth!.userId;
      const {
        barcode,
        name,
        brand,
        category,
        servingSize,
        calories,
        protein,
        carbohydrates,
        sugar,
        fat,
        saturatedFat,
        fiber,
        sodium,
        allergens,
        declaredAllergens,
        inferredAllergens,
        ingredients,
        nutritionFacts,
      } = parsed.data;

      const [existing] = await db
        .select()
        .from(products)
        .where(eq(products.barcode, barcode))
        .limit(1);

      if (existing) {
        return res.json({ product: existing, isNew: false });
      }

      const [product] = await db
        .insert(products)
        .values({
          barcode,
          name,
          brand: brand || "",
          category: category || "",
          servingSize,
          calories,
          protein,
          carbohydrates,
          sugar,
          fat,
          saturatedFat,
          fiber,
          sodium,
          allergens: allergens || declaredAllergens || [],
          declaredAllergens: declaredAllergens || [],
          inferredAllergens: inferredAllergens || [],
          ingredients: ingredients || null,
          nutritionFacts: nutritionFacts || null,
          contributedBy: userId,
          source: "user",
          moderationStatus: "pending",
        })
        .onConflictDoNothing()
        .returning();

      if (product) {
        await db
          .update(users)
          .set({
            contributionCount: sql`${users.contributionCount} + 1`,
          })
          .where(eq(users.id, userId));
        return res.status(201).json({ product, isNew: true });
      }

      const [existingAfterConflict] = await db
        .select()
        .from(products)
        .where(eq(products.barcode, barcode));
      return res.json({ product: existingAfterConflict, isNew: false });
    } catch (error) {
      logger.error("Product contribution failed", error, {}, req);
      res.status(500).json({ error: "Failed to contribute product" });
    }
  });

  app.post("/api/products/extract", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = extractSchema.safeParse(req.body);
      if (!parsed.success) return zodError(res, parsed);
      const { frontImage, backImage } = parsed.data;

      const result = await extractNutritionFromImages(frontImage, backImage);
      res.json(result);
    } catch (error) {
      logger.error("Nutrition extraction failed", error, {}, req);
      res.status(500).json({ error: "Failed to extract nutrition data" });
    }
  });

  // ========== SCAN HISTORY (AUTHENTICATED) ==========
  app.get("/api/history", requireAuth, async (req: Request, res: Response) => {
    try {
      const parsed = historyQuerySchema.safeParse(req.query);
      if (!parsed.success) return zodError(res, parsed);

      const userId = req.auth!.userId;
      const { sort, search, limit, offset } = parsed.data;

      let query = db
        .select({
          id: scanHistory.id,
          userId: scanHistory.userId,
          productId: scanHistory.productId,
          score: scanHistory.score,
          adviceText: scanHistory.adviceText,
          headline: scanHistory.headline,
          coachTip: scanHistory.coachTip,
          highlights: scanHistory.highlights,
          accessMethod: scanHistory.accessMethod,
          createdAt: scanHistory.createdAt,
          productName: products.name,
          productBrand: products.brand,
          productCategory: products.category,
          productBarcode: products.barcode,
          productFrontImage: products.frontImageUrl,
        })
        .from(scanHistory)
        .innerJoin(products, eq(scanHistory.productId, products.id))
        .where(
          search
            ? and(
                eq(scanHistory.userId, userId),
                ilike(products.name, `%${search}%`)
              )
            : eq(scanHistory.userId, userId)
        )
        .orderBy(
          sort === "score_high"
            ? desc(scanHistory.score)
            : sort === "score_low"
              ? asc(scanHistory.score)
              : desc(scanHistory.createdAt)
        )
        .limit(limit)
        .offset(offset);

      const result = await query;
      res.json(result);
    } catch (error) {
      logger.error("History fetch failed", error, {}, req);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.delete("/api/history/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(paramId(req));
      const userId = req.auth!.userId;
      const [entry] = await db
        .select()
        .from(scanHistory)
        .where(and(eq(scanHistory.id, id), eq(scanHistory.userId, userId)))
        .limit(1);

      if (!entry) {
        return res.status(404).json({ error: "Entry not found" });
      }

      await db.delete(scanHistory).where(eq(scanHistory.id, id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete history entry" });
    }
  });

  app.delete("/api/history/all", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.auth!.userId;
      await db.delete(scanHistory).where(eq(scanHistory.userId, userId));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to clear history" });
    }
  });

  app.get("/api/history/entry/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(paramId(req));
      const userId = req.auth!.userId;

      const [entry] = await db
        .select({
          id: scanHistory.id,
          userId: scanHistory.userId,
          productId: scanHistory.productId,
          score: scanHistory.score,
          adviceText: scanHistory.adviceText,
          headline: scanHistory.headline,
          coachTip: scanHistory.coachTip,
          highlights: scanHistory.highlights,
          profileClusterId: scanHistory.profileClusterId,
          accessMethod: scanHistory.accessMethod,
          createdAt: scanHistory.createdAt,
          productName: products.name,
          productBrand: products.brand,
          productCategory: products.category,
          productBarcode: products.barcode,
          productCalories: products.calories,
          productProtein: products.protein,
          productCarbs: products.carbohydrates,
          productSugar: products.sugar,
          productFat: products.fat,
          productSaturatedFat: products.saturatedFat,
          productFiber: products.fiber,
          productSodium: products.sodium,
          productAllergens: products.allergens,
          productServingSize: products.servingSize,
          productIngredients: products.ingredients,
          productNutritionFacts: products.nutritionFacts,
        })
        .from(scanHistory)
        .innerJoin(products, eq(scanHistory.productId, products.id))
        .where(and(eq(scanHistory.id, id), eq(scanHistory.userId, userId)));

      if (!entry) return res.status(404).json({ error: "Entry not found" });

      const checkProfile = req.query.checkProfile === "true";
      if (checkProfile) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId));

        if (user) {
          const currentClusterId =
            user.profileClusterId || computeClusterId(user);
          const entryClusterId = entry.profileClusterId || "";

          if (currentClusterId !== entryClusterId) {
            const [product] = await db
              .select()
              .from(products)
              .where(eq(products.id, entry.productId));

            if (product) {
              const scoreResult = await computeScore(product, user);
              let adviceResult;
              if (isFeatureEnabled("ENABLE_AI_ADVICE")) {
                adviceResult = await getAdvice(
                  product,
                  user,
                  scoreResult.score,
                  scoreResult.label,
                  currentClusterId,
                  scoreResult.isAllergenAlert,
                  scoreResult.matchedAllergens,
                  scoreResult.deductions
                );
              } else {
                adviceResult = getDeterministicAdvice(
                  scoreResult.score,
                  scoreResult.label,
                  scoreResult.isAllergenAlert,
                  scoreResult.matchedAllergens,
                  scoreResult.deductions
                );
              }

              await db
                .update(scanHistory)
                .set({
                  score: scoreResult.score,
                  adviceText: adviceResult.advice,
                  headline: adviceResult.headline || "",
                  coachTip: adviceResult.coachTip || "",
                  highlights: adviceResult.highlights,
                  profileClusterId: currentClusterId,
                  scoringVersion: SCORING_VERSION,
                })
                .where(eq(scanHistory.id, id));

              return res.json({
                ...entry,
                score: scoreResult.score,
                adviceText: adviceResult.advice,
                headline: adviceResult.headline || "",
                coachTip: adviceResult.coachTip || "",
                highlights: adviceResult.highlights,
                profileClusterId: currentClusterId,
                reAnalyzed: true,
                matchedAllergens: scoreResult.matchedAllergens,
                isAllergenAlert: scoreResult.isAllergenAlert,
              });
            }
          }
        }
      }

      res.json(entry);
    } catch (error) {
      logger.error("History entry fetch failed", error, {}, req);
      res.status(500).json({ error: "Failed to fetch history entry" });
    }
  });

  // ========== DAILY SCAN COUNT (AUTHENTICATED) ==========
  app.get("/api/scans/today", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.auth!.userId;
      const today = new Date().toISOString().split("T")[0];
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(dailyScanTracker)
        .where(
          and(
            eq(dailyScanTracker.userId, userId),
            eq(dailyScanTracker.scanDate, today)
          )
        );
      res.json({ count: Number(result[0]?.count || 0), limit: 10 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scan count" });
    }
  });

  // ========== USER STATS (AUTHENTICATED) ==========
  app.get("/api/stats", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.auth!.userId;

      const totalScansResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(scanHistory)
        .where(eq(scanHistory.userId, userId));
      const totalScans = Number(totalScansResult[0]?.count || 0);

      const avgScoreResult = await db
        .select({ avg: sql<number>`COALESCE(ROUND(AVG(${scanHistory.score})), 0)` })
        .from(scanHistory)
        .where(eq(scanHistory.userId, userId));
      const avgScore = Number(avgScoreResult[0]?.avg || 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyScansResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(scanHistory)
        .where(
          and(
            eq(scanHistory.userId, userId),
            sql`${scanHistory.createdAt} >= ${weekAgo.toISOString()}`
          )
        );
      const weeklyScans = Number(weeklyScansResult[0]?.count || 0);

      const bestProducts = await db
        .select({
          productName: products.name,
          productBrand: products.brand,
          score: scanHistory.score,
          productId: scanHistory.productId,
        })
        .from(scanHistory)
        .innerJoin(products, eq(scanHistory.productId, products.id))
        .where(eq(scanHistory.userId, userId))
        .orderBy(desc(scanHistory.score))
        .limit(3);

      const worstProducts = await db
        .select({
          productName: products.name,
          productBrand: products.brand,
          score: scanHistory.score,
          productId: scanHistory.productId,
        })
        .from(scanHistory)
        .innerJoin(products, eq(scanHistory.productId, products.id))
        .where(eq(scanHistory.userId, userId))
        .orderBy(asc(scanHistory.score))
        .limit(3);

      res.json({
        totalScans,
        avgScore,
        weeklyScans,
        bestProducts,
        worstProducts,
      });
    } catch (error) {
      logger.error("Stats fetch failed", error, {}, req);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ========== PRODUCT REPORT (AUTHENTICATED) ==========
  app.post("/api/products/:id/report", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(paramId(req));
      await db
        .update(products)
        .set({
          reportCount: sql`${products.reportCount} + 1`,
          moderationStatus: sql`CASE WHEN ${products.reportCount} + 1 >= 3 THEN 'flagged' ELSE ${products.moderationStatus} END`,
        })
        .where(eq(products.id, id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to report product" });
    }
  });

  // ========== ADMIN / MODERATOR ROUTES ==========
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (req.auth.role !== "admin" && req.auth.role !== "moderator") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };

  app.get("/api/admin/products/pending", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const parsed = paginationSchema.safeParse(req.query);
      if (!parsed.success) return zodError(res, parsed);
      const { limit, offset } = parsed.data;
      const pending = await db
        .select()
        .from(products)
        .where(eq(products.moderationStatus, "pending"))
        .orderBy(desc(products.createdAt))
        .limit(limit)
        .offset(offset);
      res.json(pending);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending products" });
    }
  });

  app.put("/api/admin/products/:id/moderate", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(paramId(req));
      const parsed = moderateSchema.safeParse(req.body);
      if (!parsed.success) return zodError(res, parsed);
      const { action } = parsed.data;

      const moderatorId = req.auth!.userId;
      const statusMap: Record<string, string> = {
        approve: "approved",
        reject: "rejected",
        flag: "flagged",
      };

      const updateData: Record<string, unknown> = {
        moderationStatus: statusMap[action],
        updatedAt: new Date(),
      };

      if (action === "approve") {
        updateData.verifiedAt = new Date();
        updateData.verifiedBy = moderatorId;
      }

      await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, id));

      const [updated] = await db
        .select()
        .from(products)
        .where(eq(products.id, id));

      res.json({ product: updated, action });
    } catch (error) {
      res.status(500).json({ error: "Failed to moderate product" });
    }
  });

  app.get("/api/admin/products/flagged", requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
      const flagged = await db
        .select()
        .from(products)
        .where(eq(products.moderationStatus, "flagged"))
        .orderBy(desc(products.reportCount))
        .limit(50);
      res.json(flagged);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch flagged products" });
    }
  });

  // ========== FEATURE-FLAGGED: CHAT & IMAGE GENERATION ==========
  if (isFeatureEnabled("ENABLE_CHAT")) {
    registerChatRoutes(app, requireAuth);
    logger.info("Chat routes enabled");
  } else {
    const chatDisabled = (_req: Request, res: Response) => {
      res.status(403).json({ error: "Chat feature is disabled" });
    };
    app.all("/api/conversations", chatDisabled);
    app.all("/api/conversations/:id", chatDisabled);
    app.all("/api/conversations/:id/messages", chatDisabled);
  }

  if (isFeatureEnabled("ENABLE_IMAGE_GENERATION")) {
    registerImageRoutes(app);
    logger.info("Image generation routes enabled");
  } else {
    app.post("/api/generate-image", (_req: Request, res: Response) => {
      res.status(403).json({ error: "Image generation feature is disabled" });
    });
  }

  // ========== HEALTH CHECK ==========
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: SCORING_VERSION,
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
