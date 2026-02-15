import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import {
  users,
  products,
  scanHistory,
  dailyScanTracker,
} from "@shared/schema";
import { eq, and, ilike, or, desc, sql, asc } from "drizzle-orm";
import { computeScore, computeClusterId } from "./scoring-engine";
import { getAdvice, extractNutritionFromImages } from "./ai-advice";

function paramId(req: Request, name: string = "id"): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api", (_req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    next();
  });

  // ========== USER PROFILE ==========
  app.post("/api/users", async (req: Request, res: Response) => {
    try {
      const { email, name } = req.body;
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existing.length > 0) {
        return res.json(existing[0]);
      }
      const [user] = await db
        .insert(users)
        .values({ email, name: name || "" })
        .returning();
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.get("/api/users/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(paramId(req));
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.put("/api/users/:id/profile", async (req: Request, res: Response) => {
    try {
      const id = parseInt(paramId(req));
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
      } = req.body;

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
        })
        .where(eq(users.id, id))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // ========== PRODUCTS ==========
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
      const query = (req.query.q as string) || "";
      const category = req.query.category as string;
      const limit = parseInt((req.query.limit as string) || "20");

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
      const result = await db
        .select()
        .from(products)
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

  // ========== SCORING & ADVICE ==========
  app.post("/api/score", async (req: Request, res: Response) => {
    try {
      const { userId, productId, accessMethod } = req.body;

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

      const adviceResult = await getAdvice(
        product,
        user,
        scoreResult.score,
        scoreResult.label,
        clusterId,
        scoreResult.isAllergenAlert,
        scoreResult.matchedAllergens,
        scoreResult.deductions
      );

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
          highlights: adviceResult.highlights,
          profileClusterId: clusterId,
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
        product,
        historyId: historyEntry.id,
      });
    } catch (error) {
      console.error("Error computing score:", error);
      res.status(500).json({ error: "Failed to compute score" });
    }
  });

  // ========== CONTRIBUTION ==========
  app.post("/api/products/contribute", async (req: Request, res: Response) => {
    try {
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
        ingredients,
        nutritionFacts,
        contributedBy,
      } = req.body;

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
          allergens: allergens || [],
          ingredients: ingredients || null,
          nutritionFacts: nutritionFacts || null,
          contributedBy,
          moderationStatus: "pending",
        })
        .onConflictDoNothing()
        .returning();

      if (product) {
        if (contributedBy) {
          await db
            .update(users)
            .set({
              contributionCount: sql`${users.contributionCount} + 1`,
            })
            .where(eq(users.id, contributedBy));
        }
        return res.status(201).json({ product, isNew: true });
      }

      const [existingAfterConflict] = await db
        .select()
        .from(products)
        .where(eq(products.barcode, barcode));
      return res.json({ product: existingAfterConflict, isNew: false });
    } catch (error) {
      console.error("Error contributing product:", error);
      res.status(500).json({ error: "Failed to contribute product" });
    }
  });

  app.post("/api/products/extract", async (req: Request, res: Response) => {
    try {
      const { frontImage, backImage } = req.body;
      if (!frontImage || !backImage) {
        return res
          .status(400)
          .json({ error: "Both front and back images are required" });
      }

      const result = await extractNutritionFromImages(frontImage, backImage);
      res.json(result);
    } catch (error) {
      console.error("Error extracting nutrition:", error);
      res.status(500).json({ error: "Failed to extract nutrition data" });
    }
  });

  // ========== SCAN HISTORY ==========
  app.get("/api/history/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(paramId(req, "userId"));
      const sort = (req.query.sort as string) || "date";
      const search = req.query.search as string;
      const limit = parseInt((req.query.limit as string) || "20");
      const offset = parseInt((req.query.offset as string) || "0");

      let query = db
        .select({
          id: scanHistory.id,
          userId: scanHistory.userId,
          productId: scanHistory.productId,
          score: scanHistory.score,
          adviceText: scanHistory.adviceText,
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
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch history" });
    }
  });

  app.delete("/api/history/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(paramId(req));
      await db.delete(scanHistory).where(eq(scanHistory.id, id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete history entry" });
    }
  });

  app.delete(
    "/api/history/user/:userId/all",
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(paramId(req, "userId"));
        await db.delete(scanHistory).where(eq(scanHistory.userId, userId));
        res.status(204).send();
      } catch (error) {
        res.status(500).json({ error: "Failed to clear history" });
      }
    }
  );

  app.get("/api/history/entry/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(paramId(req));
      const [entry] = await db
        .select({
          id: scanHistory.id,
          userId: scanHistory.userId,
          productId: scanHistory.productId,
          score: scanHistory.score,
          adviceText: scanHistory.adviceText,
          highlights: scanHistory.highlights,
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
        .where(eq(scanHistory.id, id));

      if (!entry) return res.status(404).json({ error: "Entry not found" });
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch history entry" });
    }
  });

  // ========== DAILY SCAN COUNT ==========
  app.get(
    "/api/scans/today/:userId",
    async (req: Request, res: Response) => {
      try {
        const userId = parseInt(paramId(req, "userId"));
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
    }
  );

  // ========== USER STATS ==========
  app.get("/api/stats/:userId", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(paramId(req, "userId"));

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
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ========== PRODUCT REPORT ==========
  app.post("/api/products/:id/report", async (req: Request, res: Response) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
