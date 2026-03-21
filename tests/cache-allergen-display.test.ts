import { describe, it, expect } from "vitest";
import { getDeterministicAdvice } from "../server/ai-advice";
import { computeScore } from "../server/scoring-engine";
import type { ScoreDeduction } from "../server/scoring-engine";
import type { Product, User } from "../shared/schema";
import { PROMPT_VERSION, MODEL_VERSION, SCORING_VERSION } from "../server/scoring-engine";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    barcode: "0000000000001",
    name: "Test Product",
    brand: "Test",
    category: "Test",
    servingSize: "100g",
    calories: 100,
    protein: 5,
    carbohydrates: 20,
    sugar: 5,
    fat: 3,
    saturatedFat: 1,
    fiber: 2,
    sodium: 100,
    allergens: [],
    declaredAllergens: [],
    inferredAllergens: [],
    ingredients: "test ingredients",
    nutritionFacts: null,
    extractionConfidence: null,
    fatsecretFoodId: null,
    frontImageUrl: null,
    nutritionImageUrl: null,
    contributedBy: null,
    source: "test",
    moderationStatus: "approved",
    verifiedAt: null,
    verifiedBy: null,
    reportCount: 0,
    scanCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Product;
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    email: "test@test.com",
    passwordHash: null,
    authProvider: "google",
    authProviderId: "test-provider-id",
    name: "Test",
    age: 30,
    gender: "male",
    heightCm: 175,
    weightKg: 75,
    conditions: [],
    conditionsOther: null,
    allergies: [],
    allergiesOther: null,
    dietaryPreference: null,
    goal: "general_wellness",
    profileClusterId: null,
    onboardingCompleted: true,
    isPro: false,
    role: "user",
    contributionCount: 0,
    emailVerifiedAt: null,
    consentPolicyVersion: null,
    consentAiVersion: null,
    consentAcceptedAt: null,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe("AI cache consistency: deterministic fallback stability", () => {
  it("deterministic fallback is stable across repeated calls with same inputs", () => {
    const deductions: ScoreDeduction[] = [
      { nutrient: "sugar", value: 20, points: -10, reason: "sugar is concerning for diabetes type 2", category: "penalty" },
    ];
    const result1 = getDeterministicAdvice(40, "Consume with Caution", false, [], deductions);
    const result2 = getDeterministicAdvice(40, "Consume with Caution", false, [], deductions);
    expect(result1.advice).toBe(result2.advice);
    expect(result1.headline).toBe(result2.headline);
    expect(result1.coachTip).toBe(result2.coachTip);
    expect(result1.highlights).toEqual(result2.highlights);
  });

  it("deterministic fallback returns all AdviceResult fields", () => {
    const result = getDeterministicAdvice(60, "Generally Good", false, [], []);
    expect(typeof result.advice).toBe("string");
    expect(result.advice.length).toBeGreaterThan(0);
    expect(typeof result.headline).toBe("string");
    expect(result.headline.length).toBeGreaterThan(0);
    expect(typeof result.coachTip).toBe("string");
    expect(result.coachTip.length).toBeGreaterThan(0);
    expect(Array.isArray(result.highlights)).toBe(true);
    expect(result.fromCache).toBe(false);
  });

  it("allergen alert deterministic advice includes all matched allergens", () => {
    const result = getDeterministicAdvice(0, "Allergen Alert", true, ["gluten", "milk", "soy"], []);
    expect(result.headline).toBe("Allergen Alert");
    expect(result.advice).toContain("gluten");
    expect(result.advice).toContain("milk");
    expect(result.advice).toContain("soy");
    expect(result.highlights).toContain("Contains: gluten");
    expect(result.highlights).toContain("Contains: milk");
    expect(result.highlights).toContain("Contains: soy");
  });

  it("deterministic advice adapts to score tier", () => {
    const excellent = getDeterministicAdvice(90, "Excellent Fit", false, [], []);
    const poor = getDeterministicAdvice(10, "Strongly Avoid", false, [], []);
    expect(excellent.advice).not.toBe(poor.advice);
    expect(excellent.coachTip).not.toBe(poor.coachTip);
  });

  it("highlights are capped at 3 deductions", () => {
    const deductions: ScoreDeduction[] = [
      { nutrient: "sugar", value: 30, points: -10, reason: "R1", category: "penalty" },
      { nutrient: "fat", value: 20, points: -8, reason: "R2", category: "penalty" },
      { nutrient: "sodium", value: 600, points: -5, reason: "R3", category: "penalty" },
      { nutrient: "calories", value: 400, points: -3, reason: "R4", category: "penalty" },
      { nutrient: "saturatedFat", value: 10, points: -2, reason: "R5", category: "penalty" },
    ];
    const result = getDeterministicAdvice(20, "Strongly Avoid", false, [], deductions);
    expect(result.highlights.length).toBeLessThanOrEqual(3);
  });
});

describe("AI cache version constants", () => {
  it("PROMPT_VERSION, MODEL_VERSION, SCORING_VERSION are non-empty strings", () => {
    expect(typeof PROMPT_VERSION).toBe("string");
    expect(PROMPT_VERSION.length).toBeGreaterThan(0);
    expect(typeof MODEL_VERSION).toBe("string");
    expect(MODEL_VERSION.length).toBeGreaterThan(0);
    expect(typeof SCORING_VERSION).toBe("string");
    expect(SCORING_VERSION.length).toBeGreaterThan(0);
  });
});

describe("AI cache version-aware invalidation (source verification)", () => {
  it("getAdvice cache lookup filters by all three version fields", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/ai-advice.ts", "utf-8");

    const cacheQuery = source.slice(
      source.indexOf("const cached = await db"),
      source.indexOf("if (cached.length > 0)")
    );
    expect(cacheQuery).toContain("adviceCache.promptVersion");
    expect(cacheQuery).toContain("adviceCache.modelVersion");
    expect(cacheQuery).toContain("adviceCache.scoringVersion");
  });

  it("getAdvice cache write stores all three version fields", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/ai-advice.ts", "utf-8");

    const cacheInsert = source.slice(
      source.indexOf("db.insert(adviceCache)"),
      source.indexOf("return {", source.indexOf("db.insert(adviceCache)"))
    );
    expect(cacheInsert).toContain("promptVersion: PROMPT_VERSION");
    expect(cacheInsert).toContain("modelVersion: MODEL_VERSION");
    expect(cacheInsert).toContain("scoringVersion: SCORING_VERSION");
  });

  it("cache hit returns stored headline/coachTip with fallback for null fields", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/ai-advice.ts", "utf-8");

    const cacheHit = source.slice(
      source.indexOf("if (cached.length > 0)"),
      source.indexOf("const fallback = getDeterministicAdvice")
    );
    expect(cacheHit).toContain("cached[0].headline ?? cachedFallback.headline");
    expect(cacheHit).toContain("cached[0].coachTip ?? cachedFallback.coachTip");
    expect(cacheHit).toContain("getDeterministicAdvice");
  });
});

describe("allergenDisplayState: all four states (behavioral)", () => {
  it("hard_alert: user allergen matches declared allergens → score 0", async () => {
    const product = makeProduct({ declaredAllergens: ["milk", "soy"] });
    const user = makeUser({ allergies: ["milk"] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("hard_alert");
    expect(result.score).toBe(0);
    expect(result.isAllergenAlert).toBe(true);
    expect(result.matchedAllergens).toContain("milk");
  });

  it("product_contains_nonmatching: product has allergens but user doesn't match any", async () => {
    const product = makeProduct({ declaredAllergens: ["gluten", "soy"], inferredAllergens: ["sesame"] });
    const user = makeUser({ allergies: ["peanuts"] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("product_contains_nonmatching");
    expect(result.score).not.toBe(0);
    expect(result.isAllergenAlert).toBe(false);
    expect(result.productDeclaredAllergens).toEqual(["gluten", "soy"]);
    expect(result.productInferredAllergens).toEqual(["sesame"]);
  });

  it("possible_risk: inferred allergens match user but declared do not → non-zero score + warning", async () => {
    const product = makeProduct({ declaredAllergens: [], inferredAllergens: ["milk"] });
    const user = makeUser({ allergies: ["milk"] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("possible_risk");
    expect(result.score).not.toBe(0);
    expect(result.isAllergenAlert).toBe(false);
    expect(result.inferredAllergenWarnings).toContain("milk");
  });

  it("none: product has no allergens at all", async () => {
    const product = makeProduct({ declaredAllergens: [], inferredAllergens: [] });
    const user = makeUser({ allergies: ["gluten"] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("none");
    expect(result.score).not.toBe(0);
    expect(result.isAllergenAlert).toBe(false);
    expect(result.matchedAllergens).toEqual([]);
    expect(result.inferredAllergenWarnings).toEqual([]);
  });

  it("none: user has no allergies, product has allergens", async () => {
    const product = makeProduct({ declaredAllergens: ["wheat"], inferredAllergens: ["milk"] });
    const user = makeUser({ allergies: [] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("product_contains_nonmatching");
    expect(result.isAllergenAlert).toBe(false);
    expect(result.matchedAllergens).toEqual([]);
  });

  it("possible_risk takes priority over product_contains_nonmatching when both apply", async () => {
    const product = makeProduct({ declaredAllergens: ["gluten"], inferredAllergens: ["milk"] });
    const user = makeUser({ allergies: ["milk"] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("possible_risk");
    expect(result.inferredAllergenWarnings).toContain("milk");
  });

  it("hard_alert with allergen group matching (lactose → milk)", async () => {
    const product = makeProduct({ declaredAllergens: ["lactose"] });
    const user = makeUser({ allergies: ["milk"] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("hard_alert");
    expect(result.score).toBe(0);
    expect(result.isAllergenAlert).toBe(true);
  });
});
