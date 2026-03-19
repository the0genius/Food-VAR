import { logger } from "./logger";
import { inferAllergensFromIngredients } from "./allergen-inference";

const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const API_BASE = "https://platform.fatsecret.com/rest/server.api";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET are required");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials&scope=basic",
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error("FatSecret token request failed", { status: res.status, body: text });
    throw new Error(`FatSecret OAuth failed: ${res.status}`);
  }

  const data = await res.json() as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.value;
}

interface FatSecretApiError {
  error?: { code: number; message: string };
}

interface FatSecretBarcodeResponse extends FatSecretApiError {
  food_id?: { value: string } | string;
}

interface FatSecretFoodResponse extends FatSecretApiError {
  food?: {
    food_id: string;
    food_name: string;
    brand_name?: string;
    food_type?: string;
    food_description?: string;
    food_sub_categories?: { food_sub_category?: string[] };
    servings?: {
      serving: FatSecretServing | FatSecretServing[];
    };
  };
}

async function apiCall(method: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const token = await getAccessToken();

  const url = new URL(API_BASE);
  url.searchParams.set("method", method);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error("FatSecret API call failed", { method, status: res.status, body: text });
    throw new Error(`FatSecret API error: ${res.status}`);
  }

  return res.json();
}

export async function lookupBarcode(barcode: string): Promise<string | null> {
  try {
    const data = await apiCall("food.find_id_for_barcode", { barcode }) as FatSecretBarcodeResponse;

    if (data.error) {
      const { code, message: msg } = data.error;
      if (code === 21) {
        logger.warn("FatSecret IP not whitelisted — add your server IP to the FatSecret developer portal", { message: msg });
      } else {
        logger.warn("FatSecret API error", { code, message: msg, barcode });
      }
      return null;
    }

    const rawId = data.food_id;
    const foodId = typeof rawId === "object" && rawId !== null ? rawId.value : rawId;
    if (!foodId) return null;
    return String(foodId);
  } catch (err) {
    logger.warn("FatSecret barcode lookup failed", { barcode, error: String(err) });
    return null;
  }
}

interface FatSecretServing {
  serving_description?: string;
  measurement_description?: string;
  metric_serving_amount?: string;
  metric_serving_unit?: string;
  calories?: string;
  protein?: string;
  carbohydrate?: string;
  sugar?: string;
  fat?: string;
  saturated_fat?: string;
  fiber?: string;
  sodium?: string;
  cholesterol?: string;
  trans_fat?: string;
  potassium?: string;
  calcium?: string;
  iron?: string;
  vitamin_a?: string;
  vitamin_c?: string;
  added_sugars?: string;
}

export interface FatSecretProduct {
  fatsecretFoodId: string;
  name: string;
  brand: string;
  category: string;
  servingSize: string | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  sugar: number | null;
  fat: number | null;
  saturatedFat: number | null;
  fiber: number | null;
  sodium: number | null;
  ingredients: string | null;
  declaredAllergens: string[];
  inferredAllergens: string[];
  nutritionFacts: Record<string, number | string | null> | null;
}

function parseNum(val?: string): number | null {
  if (val === undefined || val === null || val === "") return null;
  const n = parseFloat(val);
  return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

interface FatSecretServings {
  serving: FatSecretServing | FatSecretServing[];
}

function pickServing(servings: FatSecretServings | undefined): FatSecretServing | null {
  if (!servings) return null;
  const raw = servings.serving;
  const list: FatSecretServing[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (list.length === 0) return null;

  const per100g = list.find((s) =>
    s.measurement_description === "g" && s.metric_serving_amount === "100.000"
  );
  if (per100g) return per100g;

  return list[0];
}

export async function getFoodDetails(foodId: string): Promise<FatSecretProduct | null> {
  try {
    const data = await apiCall("food.get.v4", { food_id: foodId }) as FatSecretFoodResponse;

    if (data.error) {
      logger.warn("FatSecret food details API error", { foodId, code: data.error.code, message: data.error.message });
      return null;
    }

    const food = data.food;
    if (!food) return null;

    const serving = pickServing(food.servings);
    if (!serving) return null;

    const servingSize = serving.serving_description
      || (serving.metric_serving_amount && serving.metric_serving_unit
        ? `${serving.metric_serving_amount}${serving.metric_serving_unit}`
        : null);

    const extendedFacts: Record<string, number | string | null> = {};
    const extendedKeys: [string, string][] = [
      ["cholesterol", "cholesterol"],
      ["trans_fat", "transFat"],
      ["potassium", "potassium"],
      ["calcium", "calcium"],
      ["iron", "iron"],
      ["vitamin_a", "vitaminA"],
      ["vitamin_c", "vitaminC"],
      ["added_sugars", "addedSugars"],
    ];
    for (const [fsKey, ourKey] of extendedKeys) {
      const v = parseNum(serving[fsKey as keyof FatSecretServing]);
      if (v !== null) extendedFacts[ourKey] = v;
    }

    let ingredients: string | null = null;
    if (typeof food.food_description === "string") {
      const descLower = food.food_description.toLowerCase();
      if (descLower.includes("ingredients:") || descLower.includes("contains:")) {
        ingredients = food.food_description;
      }
    }

    const inferredAllergens = ingredients
      ? inferAllergensFromIngredients(ingredients)
      : [];

    return {
      fatsecretFoodId: foodId,
      name: food.food_name || "Unknown Product",
      brand: food.brand_name || "",
      category: food.food_type === "Brand" ? "Packaged" : (food.food_sub_categories?.food_sub_category?.[0] || ""),
      servingSize,
      calories: parseNum(serving.calories),
      protein: parseNum(serving.protein),
      carbohydrates: parseNum(serving.carbohydrate),
      sugar: parseNum(serving.sugar),
      fat: parseNum(serving.fat),
      saturatedFat: parseNum(serving.saturated_fat),
      fiber: parseNum(serving.fiber),
      sodium: parseNum(serving.sodium),
      ingredients,
      declaredAllergens: [],
      inferredAllergens,
      nutritionFacts: Object.keys(extendedFacts).length > 0 ? extendedFacts : null,
    };
  } catch (err) {
    logger.error("FatSecret food details fetch failed", { foodId, error: String(err) });
    return null;
  }
}

export async function fetchByBarcode(barcode: string): Promise<FatSecretProduct | null> {
  const foodId = await lookupBarcode(barcode);
  if (!foodId) return null;
  return getFoodDetails(foodId);
}

export function isFatSecretConfigured(): boolean {
  return !!(process.env.FATSECRET_CLIENT_ID && process.env.FATSECRET_CLIENT_SECRET);
}
