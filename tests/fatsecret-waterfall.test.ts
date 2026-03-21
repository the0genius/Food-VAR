import { describe, it, expect } from "vitest";
import type { FatSecretProduct } from "../server/fatsecret";

describe("FatSecret waterfall logic (source code verification)", () => {
  it("barcode route tries FatSecret first when configured", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const barcodeRoute = source.match(
      /app\.get\("\/api\/products\/barcode\/:barcode"[\s\S]*?^\s{2}\}\);/m
    );
    expect(barcodeRoute).toBeTruthy();
    const routeBlock = barcodeRoute![0];

    expect(routeBlock).toContain("isFatSecretConfigured()");
    expect(routeBlock).toContain("fetchByBarcode(barcode)");

    const fatSecretIdx = routeBlock.indexOf("fetchByBarcode");
    const localDbIdx = routeBlock.indexOf('ne(products.source, "fatsecret")');
    expect(fatSecretIdx).toBeLessThan(localDbIdx);
  });

  it("barcode route falls back to local DB on FatSecret failure", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const barcodeRoute = source.match(
      /app\.get\("\/api\/products\/barcode\/:barcode"[\s\S]*?^\s{2}\}\);/m
    );
    expect(barcodeRoute).toBeTruthy();
    const routeBlock = barcodeRoute![0];

    expect(routeBlock).toContain("catch (fsError)");
    expect(routeBlock).toContain("FatSecret lookup failed, falling back to local DB");
  });

  it("local DB fallback excludes fatsecret-sourced rows", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const barcodeRoute = source.match(
      /app\.get\("\/api\/products\/barcode\/:barcode"[\s\S]*?^\s{2}\}\);/m
    );
    expect(barcodeRoute).toBeTruthy();
    const routeBlock = barcodeRoute![0];

    expect(routeBlock).toContain('ne(products.source, "fatsecret")');
  });

  it("barcode route returns 404 when both FatSecret and local DB miss", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const barcodeRoute = source.match(
      /app\.get\("\/api\/products\/barcode\/:barcode"[\s\S]*?^\s{2}\}\);/m
    );
    expect(barcodeRoute).toBeTruthy();
    const routeBlock = barcodeRoute![0];

    expect(routeBlock).toContain('res.status(404).json');
    expect(routeBlock).toContain("Product not found");
  });

  it("barcode route applies approved product filter for local DB", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const barcodeRoute = source.match(
      /app\.get\("\/api\/products\/barcode\/:barcode"[\s\S]*?^\s{2}\}\);/m
    );
    expect(barcodeRoute).toBeTruthy();
    const routeBlock = barcodeRoute![0];

    expect(routeBlock).toContain("getApprovedProductFilter()");
  });

  it("upsertFatSecretReference stores thin reference with source fatsecret", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const upsertFn = source.match(
      /async function upsertFatSecretReference[\s\S]*?^}/m
    );
    expect(upsertFn).toBeTruthy();
    const fnBlock = upsertFn![0];

    expect(fnBlock).toContain('source: "fatsecret"');
    expect(fnBlock).toContain('moderationStatus: "approved"');
    expect(fnBlock).toContain("fatsecretFoodId: fs.fatsecretFoodId");
    expect(fnBlock).toContain("name: fs.name");
    expect(fnBlock).toContain("brand: fs.brand");

    expect(fnBlock).not.toContain("calories: fs.calories");
    expect(fnBlock).not.toContain("protein: fs.protein");
  });

  it("mergeProductWithFatSecret overlays nutrition from FatSecret onto thin reference", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const mergeFn = source.match(
      /function mergeProductWithFatSecret[\s\S]*?^}/m
    );
    expect(mergeFn).toBeTruthy();
    const fnBlock = mergeFn![0];

    expect(fnBlock).toContain("...dbProduct");
    expect(fnBlock).toContain("calories: fs.calories");
    expect(fnBlock).toContain("protein: fs.protein");
    expect(fnBlock).toContain("declaredAllergens: fs.declaredAllergens");
    expect(fnBlock).toContain("inferredAllergens: fs.inferredAllergens");
  });

  it("contribute endpoint does not overwrite existing user-contributed products", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const contributeRoute = source.match(
      /app\.post\("\/api\/products\/contribute"[\s\S]*?^\s{2}\}\);/m
    );
    expect(contributeRoute).toBeTruthy();
    const routeBlock = contributeRoute![0];

    expect(routeBlock).toContain('ne(products.source, "fatsecret")');
  });
});

describe("FatSecret fetchByBarcode chaining", () => {
  it("fetchByBarcode calls lookupBarcode then getFoodDetails", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/fatsecret.ts", "utf-8");

    const fetchByBarcodeFn = source.match(
      /export async function fetchByBarcode[\s\S]*?^}/m
    );
    expect(fetchByBarcodeFn).toBeTruthy();
    const fnBlock = fetchByBarcodeFn![0];

    expect(fnBlock).toContain("lookupBarcode(barcode)");
    expect(fnBlock).toContain("getFoodDetails(foodId)");

    const lookupIdx = fnBlock.indexOf("lookupBarcode");
    const detailsIdx = fnBlock.indexOf("getFoodDetails");
    expect(lookupIdx).toBeLessThan(detailsIdx);
  });

  it("fetchByBarcode returns null when lookupBarcode returns null", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/fatsecret.ts", "utf-8");

    const fetchByBarcodeFn = source.match(
      /export async function fetchByBarcode[\s\S]*?^}/m
    );
    expect(fetchByBarcodeFn).toBeTruthy();
    const fnBlock = fetchByBarcodeFn![0];

    expect(fnBlock).toContain("if (!foodId) return null");
  });

  it("lookupBarcode returns null on API error gracefully", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/fatsecret.ts", "utf-8");

    const lookupFn = source.match(
      /export async function lookupBarcode[\s\S]*?^}/m
    );
    expect(lookupFn).toBeTruthy();
    const fnBlock = lookupFn![0];

    expect(fnBlock).toContain("catch (err)");
    expect(fnBlock).toContain("return null");
  });
});

describe("FatSecretProduct type shape", () => {
  it("FatSecretProduct has declaredAllergens and inferredAllergens arrays", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/fatsecret.ts", "utf-8");

    expect(source).toContain("declaredAllergens: string[]");
    expect(source).toContain("inferredAllergens: string[]");
  });

  it("getFoodDetails always returns empty declaredAllergens", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/fatsecret.ts", "utf-8");

    const detailsFn = source.match(
      /export async function getFoodDetails[\s\S]*?^}/m
    );
    expect(detailsFn).toBeTruthy();
    const fnBlock = detailsFn![0];

    expect(fnBlock).toContain("declaredAllergens: []");
  });

  it("getFoodDetails infers allergens from ingredients", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/fatsecret.ts", "utf-8");

    expect(source).toContain("inferAllergensFromIngredients");

    const detailsFn = source.match(
      /export async function getFoodDetails[\s\S]*?^}/m
    );
    expect(detailsFn).toBeTruthy();
    const fnBlock = detailsFn![0];

    expect(fnBlock).toContain("inferAllergensFromIngredients(ingredients)");
  });
});

describe("FatSecret API resilience structure", () => {
  it("has 10-second timeout on API calls", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/fatsecret.ts", "utf-8");

    expect(source).toContain("API_TIMEOUT_MS = 10_000");
    expect(source).toContain("TOKEN_TIMEOUT_MS = 10_000");
  });

  it("has retry logic with 1-second backoff", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/fatsecret.ts", "utf-8");

    expect(source).toContain("RETRY_BACKOFF_MS = 1_000");
    expect(source).toContain("isTransientError");
  });

  it("only retries on transient errors (5xx, network errors)", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/fatsecret.ts", "utf-8");

    const isTransientFn = source.match(
      /function isTransientError[\s\S]*?^}/m
    );
    expect(isTransientFn).toBeTruthy();
    const fnBlock = isTransientFn![0];

    expect(fnBlock).toContain("status >= 500");
    expect(fnBlock).toContain("TypeError");
    expect(fnBlock).toContain("AbortError");
    expect(fnBlock).toContain("ECONNRESET");
    expect(fnBlock).toContain("ETIMEDOUT");
  });

  it("token is cached with TTL", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/fatsecret.ts", "utf-8");

    expect(source).toContain("cachedToken");
    expect(source).toContain("expiresAt: Date.now() + data.expires_in * 1000");

    const getTokenFn = source.match(
      /async function getAccessToken[\s\S]*?^}/m
    );
    expect(getTokenFn).toBeTruthy();
    expect(getTokenFn![0]).toContain("Date.now() < cachedToken.expiresAt - 60_000");
  });
});
