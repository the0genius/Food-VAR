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
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    inferAllergensFromIngredients: vi.fn().mockReturnValue(["milk"]),
  };
});

let fetchCallCount = 0;
let fetchResponses: Array<() => Response | Promise<Response>> = [];
const originalFetch = global.fetch;

function mockFetchSequence(responses: Array<() => Response | Promise<Response>>) {
  fetchCallCount = 0;
  fetchResponses = responses;
  global.fetch = vi.fn(async () => {
    const idx = fetchCallCount++;
    if (idx < fetchResponses.length) {
      return fetchResponses[idx]();
    }
    return new Response(JSON.stringify({ error: "unexpected call" }), { status: 500 });
  }) as unknown as typeof fetch;
}

function tokenResponse() {
  return new Response(JSON.stringify({ access_token: "test-token", expires_in: 3600 }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function barcodeResponse(foodId: string) {
  return new Response(JSON.stringify({ food_id: { value: foodId } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function foodDetailsResponse(overrides: Record<string, string> = {}) {
  return new Response(JSON.stringify({
    food: {
      food_id: "12345",
      food_name: overrides.name || "Waterfall Test Product",
      brand_name: overrides.brand || "Test Brand",
      food_type: "Brand",
      food_description: overrides.description || "Ingredients: wheat flour, milk, sugar",
      servings: {
        serving: {
          serving_description: "1 serving (100g)",
          calories: "250",
          protein: "8",
          carbohydrate: "35",
          sugar: "12",
          fat: "9",
          saturated_fat: "3",
          fiber: "2",
          sodium: "300",
        },
      },
    },
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyBarcodeResponse() {
  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("FatSecret waterfall: fetchByBarcode end-to-end", () => {
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

  it("returns full product when barcode lookup + food details succeed", async () => {
    mockFetchSequence([
      () => tokenResponse(),
      () => barcodeResponse("12345"),
      () => foodDetailsResponse(),
    ]);

    const { fetchByBarcode } = await import("../server/fatsecret");
    const result = await fetchByBarcode("1234567890");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Waterfall Test Product");
    expect(result!.brand).toBe("Test Brand");
    expect(result!.fatsecretFoodId).toBe("12345");
    expect(result!.calories).toBe(250);
    expect(result!.protein).toBe(8);
    expect(result!.sodium).toBe(300);
  });

  it("returns null when barcode not found in FatSecret", async () => {
    mockFetchSequence([
      () => tokenResponse(),
      () => emptyBarcodeResponse(),
    ]);

    const { fetchByBarcode } = await import("../server/fatsecret");
    const result = await fetchByBarcode("9999999999");
    expect(result).toBeNull();
  });

  it("returns null when barcode found but food details fail", async () => {
    mockFetchSequence([
      () => tokenResponse(),
      () => barcodeResponse("12345"),
      () => new Response("Internal Server Error", { status: 500 }),
      () => new Response("Internal Server Error", { status: 500 }),
    ]);

    const { fetchByBarcode } = await import("../server/fatsecret");
    const result = await fetchByBarcode("1234567890");
    expect(result).toBeNull();
  });

  it("FatSecret products always have empty declaredAllergens", async () => {
    const { getFoodDetails } = await import("../server/fatsecret");

    mockFetchSequence([
      () => tokenResponse(),
      () => foodDetailsResponse(),
    ]);

    const result = await getFoodDetails("12345");
    expect(result).not.toBeNull();
    expect(result!.declaredAllergens).toEqual([]);
  });

  it("FatSecret products have inferred allergens from ingredients", async () => {
    const { getFoodDetails } = await import("../server/fatsecret");

    mockFetchSequence([
      () => tokenResponse(),
      () => foodDetailsResponse({ description: "Ingredients: wheat flour, milk, sugar" }),
    ]);

    const result = await getFoodDetails("12345");
    expect(result).not.toBeNull();
    expect(Array.isArray(result!.inferredAllergens)).toBe(true);
  });
});

describe("isFatSecretConfigured", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.FATSECRET_CLIENT_ID;
    delete process.env.FATSECRET_CLIENT_SECRET;
  });

  it("returns true when both env vars are set", async () => {
    process.env.FATSECRET_CLIENT_ID = "id";
    process.env.FATSECRET_CLIENT_SECRET = "secret";
    const { isFatSecretConfigured } = await import("../server/fatsecret");
    expect(isFatSecretConfigured()).toBe(true);
  });

  it("returns false when client ID is missing", async () => {
    delete process.env.FATSECRET_CLIENT_ID;
    process.env.FATSECRET_CLIENT_SECRET = "secret";
    const { isFatSecretConfigured } = await import("../server/fatsecret");
    expect(isFatSecretConfigured()).toBe(false);
  });

  it("returns false when client secret is missing", async () => {
    process.env.FATSECRET_CLIENT_ID = "id";
    delete process.env.FATSECRET_CLIENT_SECRET;
    const { isFatSecretConfigured } = await import("../server/fatsecret");
    expect(isFatSecretConfigured()).toBe(false);
  });
});

describe("barcode route waterfall logic (source verification)", () => {
  it("tries FatSecret first, falls back to local DB, then returns 404", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const barcodeRoute = source.slice(
      source.indexOf('app.get("/api/products/barcode/:barcode"'),
      source.indexOf('app.get("/api/products/search"')
    );

    const fatSecretIdx = barcodeRoute.indexOf("fetchByBarcode");
    const localDbIdx = barcodeRoute.indexOf('ne(products.source, "fatsecret")');
    const notFoundIdx = barcodeRoute.indexOf("Product not found");

    expect(fatSecretIdx).toBeGreaterThan(-1);
    expect(localDbIdx).toBeGreaterThan(fatSecretIdx);
    expect(notFoundIdx).toBeGreaterThan(localDbIdx);
  });

  it("catches FatSecret errors and falls back gracefully", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const barcodeRoute = source.slice(
      source.indexOf('app.get("/api/products/barcode/:barcode"'),
      source.indexOf('app.get("/api/products/search"')
    );

    expect(barcodeRoute).toContain("catch (fsError)");
    expect(barcodeRoute).toContain("FatSecret lookup failed, falling back to local DB");
  });

  it("excludes fatsecret-sourced rows from local DB fallback", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const barcodeRoute = source.slice(
      source.indexOf('app.get("/api/products/barcode/:barcode"'),
      source.indexOf('app.get("/api/products/search"')
    );

    expect(barcodeRoute).toContain('ne(products.source, "fatsecret")');
    expect(barcodeRoute).toContain("getApprovedProductFilter()");
  });
});

describe("thin-reference architecture", () => {
  it("upsertFatSecretReference stores only identity fields, not nutrition", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const upsertFn = source.slice(
      source.indexOf("async function upsertFatSecretReference"),
      source.indexOf("function mergeProductWithFatSecret")
    );

    expect(upsertFn).toContain("name: fs.name");
    expect(upsertFn).toContain("brand: fs.brand");
    expect(upsertFn).toContain("fatsecretFoodId: fs.fatsecretFoodId");
    expect(upsertFn).toContain('source: "fatsecret"');
    expect(upsertFn).toContain('moderationStatus: "approved"');

    expect(upsertFn).not.toContain("calories: fs.calories");
    expect(upsertFn).not.toContain("protein: fs.protein");
  });

  it("mergeProductWithFatSecret overlays nutrition from API onto DB row", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const mergeFn = source.slice(
      source.indexOf("function mergeProductWithFatSecret"),
      source.indexOf("export async function registerRoutes")
    );

    expect(mergeFn).toContain("...dbProduct");
    expect(mergeFn).toContain("calories: fs.calories");
    expect(mergeFn).toContain("protein: fs.protein");
    expect(mergeFn).toContain("declaredAllergens: fs.declaredAllergens");
    expect(mergeFn).toContain("inferredAllergens: fs.inferredAllergens");
  });
});
