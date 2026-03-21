import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
    fatsecretFoodId: null,
    extractionConfidence: null,
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

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn().mockReturnThis(),
};

vi.mock("../server/logger", () => ({
  logger: mockLogger,
}));

vi.mock("../server/allergen-inference", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    inferAllergensFromIngredients: vi.fn().mockReturnValue([]),
  };
});

let fetchCallCount = 0;
let fetchResponses: Array<() => Response | Promise<Response>> = [];

const originalFetch = global.fetch;

function mockFetchSequence(responses: Array<() => Response | Promise<Response>>) {
  fetchCallCount = 0;
  fetchResponses = responses;
  global.fetch = vi.fn(async (_url: any, _opts?: any) => {
    const idx = fetchCallCount++;
    if (idx < fetchResponses.length) {
      return fetchResponses[idx]();
    }
    return new Response(JSON.stringify({ error: "unexpected call" }), { status: 500 });
  }) as any;
}

function tokenResponse() {
  return new Response(JSON.stringify({ access_token: "test-token", expires_in: 3600 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function foodResponse(foodId: string = "12345") {
  return new Response(JSON.stringify({
    food_id: { value: foodId },
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function foodDetailsResponse() {
  return new Response(JSON.stringify({
    food: {
      food_id: "12345",
      food_name: "Test Food",
      brand_name: "Test Brand",
      food_type: "Brand",
      servings: {
        serving: {
          serving_description: "1 serving",
          calories: "200",
          protein: "10",
          carbohydrate: "25",
          sugar: "5",
          fat: "8",
          saturated_fat: "2",
          fiber: "3",
          sodium: "150",
        },
      },
    },
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function serverErrorResponse() {
  return new Response("Internal Server Error", { status: 500 });
}

describe("FatSecret API resilience", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchCallCount = 0;
    fetchResponses = [];
    process.env.FATSECRET_CLIENT_ID = "test-id";
    process.env.FATSECRET_CLIENT_SECRET = "test-secret";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.FATSECRET_CLIENT_ID;
    delete process.env.FATSECRET_CLIENT_SECRET;
    vi.restoreAllMocks();
  });

  it("retries once on transient 500 error and succeeds", async () => {
    mockFetchSequence([
      () => tokenResponse(),
      () => serverErrorResponse(),
      () => foodResponse("99999"),
    ]);

    const { lookupBarcode } = await import("../server/fatsecret");
    const result = await lookupBarcode("1234567890");
    expect(result).toBe("99999");
    expect(fetchCallCount).toBe(3);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("transient error"),
      expect.any(Object)
    );
  });

  it("returns null after retry also fails", async () => {
    mockFetchSequence([
      () => tokenResponse(),
      () => serverErrorResponse(),
      () => serverErrorResponse(),
    ]);

    const { lookupBarcode } = await import("../server/fatsecret");
    const result = await lookupBarcode("1234567890");
    expect(result).toBeNull();
    expect(fetchCallCount).toBe(3);
  });

  it("retries on AbortError (timeout simulation) and returns null if both fail", async () => {
    mockFetchSequence([
      () => tokenResponse(),
      () => { throw new DOMException("The operation was aborted", "AbortError"); },
      () => foodResponse("77777"),
    ]);

    const { lookupBarcode } = await import("../server/fatsecret");
    const result = await lookupBarcode("1234567890");
    expect(result).toBe("77777");
    expect(fetchCallCount).toBe(3);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("transient error"),
      expect.any(Object)
    );
  });

  it("retries on network TypeError and returns null if retry also throws", async () => {
    mockFetchSequence([
      () => tokenResponse(),
      () => { throw new TypeError("fetch failed"); },
      () => { throw new TypeError("fetch failed"); },
    ]);

    const { lookupBarcode } = await import("../server/fatsecret");
    const result = await lookupBarcode("1234567890");
    expect(result).toBeNull();
    expect(fetchCallCount).toBe(3);
  });

  it("does not retry on 400 client error", async () => {
    mockFetchSequence([
      () => tokenResponse(),
      () => new Response("Bad Request", { status: 400 }),
    ]);

    const { lookupBarcode } = await import("../server/fatsecret");
    const result = await lookupBarcode("1234567890");
    expect(result).toBeNull();
    expect(fetchCallCount).toBe(2);
  });

  it("handles API error code 21 (IP not whitelisted) gracefully", async () => {
    mockFetchSequence([
      () => tokenResponse(),
      () => new Response(JSON.stringify({
        error: { code: 21, message: "IP address not whitelisted" },
      }), { status: 200, headers: { "Content-Type": "application/json" } }),
    ]);

    const { lookupBarcode } = await import("../server/fatsecret");
    const result = await lookupBarcode("1234567890");
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("IP not whitelisted"),
      expect.any(Object)
    );
  });

  it("getFoodDetails returns product data on success", async () => {
    mockFetchSequence([
      () => tokenResponse(),
      () => foodDetailsResponse(),
    ]);

    const { getFoodDetails } = await import("../server/fatsecret");
    const result = await getFoodDetails("12345");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Test Food");
    expect(result!.brand).toBe("Test Brand");
    expect(result!.calories).toBe(200);
    expect(result!.declaredAllergens).toEqual([]);
  });

  it("getFoodDetails returns null on API failure", async () => {
    mockFetchSequence([
      () => tokenResponse(),
      () => serverErrorResponse(),
      () => serverErrorResponse(),
    ]);

    const { getFoodDetails } = await import("../server/fatsecret");
    const result = await getFoodDetails("12345");
    expect(result).toBeNull();
  });

  it("isFatSecretConfigured returns true when env vars are set", async () => {
    const { isFatSecretConfigured } = await import("../server/fatsecret");
    expect(isFatSecretConfigured()).toBe(true);
  });

  it("isFatSecretConfigured returns false when env vars are missing", async () => {
    delete process.env.FATSECRET_CLIENT_ID;
    delete process.env.FATSECRET_CLIENT_SECRET;
    const { isFatSecretConfigured } = await import("../server/fatsecret");
    expect(isFatSecretConfigured()).toBe(false);
  });
});

describe("allergen display state rendering assertions", () => {
  it("product_contains_nonmatching state includes all product allergens", async () => {
    const { computeScore } = await import("../server/scoring-engine");

    const product = makeProduct({
      declaredAllergens: ["gluten", "soy"],
      inferredAllergens: ["sesame"],
      source: "fatsecret",
      fatsecretFoodId: "12345",
    });

    const user = makeUser({ allergies: ["peanuts"] });

    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("product_contains_nonmatching");
    expect(result.productDeclaredAllergens).toEqual(["gluten", "soy"]);
    expect(result.productInferredAllergens).toEqual(["sesame"]);
    expect(result.isAllergenAlert).toBe(false);
    expect(result.score).not.toBe(0);
  });

  it("fatsecret source products include source field for trust note rendering", async () => {
    const { computeScore } = await import("../server/scoring-engine");

    const product = makeProduct({
      source: "fatsecret",
      fatsecretFoodId: "12345",
    });

    expect(product.source).toBe("fatsecret");
    expect(product.fatsecretFoodId).toBe("12345");

    const user = makeUser({ allergies: [] });

    const result = await computeScore(product, user);
    expect(result.allergenDisplayState).toBe("none");
    expect(result.score).toBeGreaterThan(0);
  });
});

describe("legacy allergens field safety", () => {
  it("scoring engine does not use the generic allergens field", async () => {
    const { computeScore } = await import("../server/scoring-engine");

    const product = makeProduct({
      allergens: ["milk", "peanuts"],
      declaredAllergens: [],
      inferredAllergens: [],
    });

    const user = makeUser({ allergies: ["milk"] });

    const result = await computeScore(product, user);
    expect(result.isAllergenAlert).toBe(false);
    expect(result.score).not.toBe(0);
    expect(result.matchedAllergens).toEqual([]);
    expect(result.allergenDisplayState).toBe("none");
  });
});
