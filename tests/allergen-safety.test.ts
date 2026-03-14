import { describe, it, expect } from "vitest";
import { computeScore } from "../server/scoring-engine";
import type { Product, User } from "../shared/schema";

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

describe("allergen source safety", () => {
  it("score=0 when declared allergens match user allergies", async () => {
    const product = makeProduct({ declaredAllergens: ["wheat", "soy"] });
    const user = makeUser({ allergies: ["wheat"] });
    const result = await computeScore(product, user);
    expect(result.score).toBe(0);
    expect(result.isAllergenAlert).toBe(true);
    expect(result.matchedAllergens).toContain("wheat");
  });

  it("score NOT 0 when only legacy allergens field matches (no declared allergens)", async () => {
    const product = makeProduct({
      allergens: ["wheat"],
      declaredAllergens: [],
    });
    const user = makeUser({ allergies: ["wheat"] });
    const result = await computeScore(product, user);
    expect(result.score).not.toBe(0);
    expect(result.isAllergenAlert).toBe(false);
    expect(result.matchedAllergens).toEqual([]);
  });

  it("score NOT 0 when only inferred allergens match (no declared allergens)", async () => {
    const product = makeProduct({
      inferredAllergens: ["gluten"],
      declaredAllergens: [],
    });
    const user = makeUser({ allergies: ["gluten"] });
    const result = await computeScore(product, user);
    expect(result.score).not.toBe(0);
    expect(result.isAllergenAlert).toBe(false);
  });

  it("inferred allergen warnings returned when inferred allergens match user allergies", async () => {
    const product = makeProduct({
      declaredAllergens: [],
      inferredAllergens: ["wheat", "soy"],
    });
    const user = makeUser({ allergies: ["wheat"] });
    const result = await computeScore(product, user);
    expect(result.inferredAllergenWarnings).toContain("wheat");
    expect(result.score).not.toBe(0);
  });

  it("inferred allergen warnings empty when no inferred match", async () => {
    const product = makeProduct({
      declaredAllergens: ["soy"],
      inferredAllergens: ["fish"],
    });
    const user = makeUser({ allergies: ["soy"] });
    const result = await computeScore(product, user);
    expect(result.score).toBe(0);
    expect(result.isAllergenAlert).toBe(true);
    expect(result.inferredAllergenWarnings).toEqual([]);
  });

  it("both declared alert and inferred warnings returned together", async () => {
    const product = makeProduct({
      declaredAllergens: ["wheat"],
      inferredAllergens: ["soy"],
    });
    const user = makeUser({ allergies: ["wheat", "soy"] });
    const result = await computeScore(product, user);
    expect(result.score).toBe(0);
    expect(result.isAllergenAlert).toBe(true);
    expect(result.matchedAllergens).toContain("wheat");
    expect(result.inferredAllergenWarnings).toContain("soy");
  });

  it("allergen group matching works for declared allergens", async () => {
    const product = makeProduct({ declaredAllergens: ["lactose"] });
    const user = makeUser({ allergies: ["milk"] });
    const result = await computeScore(product, user);
    expect(result.score).toBe(0);
    expect(result.isAllergenAlert).toBe(true);
  });

  it("allergen group matching works for inferred warnings", async () => {
    const product = makeProduct({
      declaredAllergens: [],
      inferredAllergens: ["lactose"],
    });
    const user = makeUser({ allergies: ["milk"] });
    const result = await computeScore(product, user);
    expect(result.score).not.toBe(0);
    expect(result.inferredAllergenWarnings).toContain("milk");
  });

  it("no allergies means no alerts and no warnings", async () => {
    const product = makeProduct({
      declaredAllergens: ["wheat"],
      inferredAllergens: ["soy"],
    });
    const user = makeUser({ allergies: [] });
    const result = await computeScore(product, user);
    expect(result.score).not.toBe(0);
    expect(result.isAllergenAlert).toBe(false);
    expect(result.matchedAllergens).toEqual([]);
    expect(result.inferredAllergenWarnings).toEqual([]);
  });
});

describe("allergenDisplayState", () => {
  it("returns hard_alert when user allergies match declared allergens", async () => {
    const product = makeProduct({ declaredAllergens: ["milk", "soy"] });
    const user = makeUser({ allergies: ["milk"] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("hard_alert");
    expect(result.isAllergenAlert).toBe(true);
    expect(result.score).toBe(0);
  });

  it("returns product_contains_nonmatching when product has allergens but none match user", async () => {
    const product = makeProduct({ declaredAllergens: ["gluten", "soy"] });
    const user = makeUser({ allergies: ["peanuts"] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("product_contains_nonmatching");
    expect(result.isAllergenAlert).toBe(false);
    expect(result.score).not.toBe(0);
  });

  it("returns possible_risk when inferred allergens match user but declared do not", async () => {
    const product = makeProduct({
      declaredAllergens: [],
      inferredAllergens: ["milk"],
    });
    const user = makeUser({ allergies: ["milk"] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("possible_risk");
    expect(result.isAllergenAlert).toBe(false);
    expect(result.inferredAllergenWarnings).toContain("milk");
  });

  it("returns none when no allergens and no user allergies", async () => {
    const product = makeProduct({ declaredAllergens: [], inferredAllergens: [] });
    const user = makeUser({ allergies: [] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("none");
    expect(result.isAllergenAlert).toBe(false);
  });

  it("returns none when user has allergies but product has no allergens", async () => {
    const product = makeProduct({ declaredAllergens: [], inferredAllergens: [] });
    const user = makeUser({ allergies: ["milk", "peanuts"] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("none");
    expect(result.isAllergenAlert).toBe(false);
  });

  it("returns productDeclaredAllergens and productInferredAllergens in result", async () => {
    const product = makeProduct({
      declaredAllergens: ["gluten", "soy"],
      inferredAllergens: ["milk"],
    });
    const user = makeUser({ allergies: [] });
    const result = await computeScore(product, user);
    expect(result.productDeclaredAllergens).toEqual(["gluten", "soy"]);
    expect(result.productInferredAllergens).toEqual(["milk"]);
  });

  it("possible_risk takes priority over product_contains_nonmatching", async () => {
    const product = makeProduct({
      declaredAllergens: ["gluten"],
      inferredAllergens: ["milk"],
    });
    const user = makeUser({ allergies: ["milk"] });
    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("possible_risk");
    expect(result.inferredAllergenWarnings).toContain("milk");
  });
});
