import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

describe("legacy allergens field safety", () => {
  it("scoring engine does not use the generic allergens field", async () => {
    const { computeScore } = await import("../server/scoring-engine");

    const product = {
      id: 1, barcode: "0000000000001", name: "Test", brand: "Test",
      category: "Test", servingSize: "100g", calories: 100, protein: 5,
      carbohydrates: 20, sugar: 5, fat: 3, saturatedFat: 1, fiber: 2, sodium: 100,
      allergens: ["milk", "peanuts"],
      declaredAllergens: [] as string[],
      inferredAllergens: [] as string[],
      ingredients: null, nutritionFacts: null, frontImageUrl: null,
      nutritionImageUrl: null, contributedBy: null, source: "test",
      moderationStatus: "approved", scanCount: 0, fatsecretFoodId: null,
      extractionConfidence: null, createdAt: new Date(), updatedAt: new Date(),
    };

    const user = {
      id: 1, username: "test", passwordHash: null, allergies: ["milk"],
      healthConditions: [], dietaryPreferences: [], email: "t@t.com",
      onboardingComplete: true, privacyConsent: false,
      authProvider: null, authProviderId: null,
      createdAt: new Date(), updatedAt: new Date(),
    };

    const result = await computeScore(product as any, user as any);
    expect(result.isAllergenAlert).toBe(false);
    expect(result.score).not.toBe(0);
    expect(result.matchedAllergens).toEqual([]);
    expect(result.allergenDisplayState).toBe("none");
  });
});
