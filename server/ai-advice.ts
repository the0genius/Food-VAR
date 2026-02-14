import { GoogleGenAI } from "@google/genai";
import { db } from "./db";
import { adviceCache, type Product, type User } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

interface AdviceResult {
  advice: string;
  highlights: string[];
  fromCache: boolean;
}

export async function getAdvice(
  product: Product,
  user: User,
  score: number,
  scoreLabel: string,
  profileClusterId: string,
  isAllergenAlert: boolean,
  matchedAllergens: string[]
): Promise<AdviceResult> {
  const cached = await db
    .select()
    .from(adviceCache)
    .where(
      and(
        eq(adviceCache.productId, product.id),
        eq(adviceCache.profileClusterId, profileClusterId),
        gt(adviceCache.expiresAt, new Date())
      )
    )
    .limit(1);

  if (cached.length > 0) {
    return {
      advice: cached[0].adviceText,
      highlights: (cached[0].highlights || []) as string[],
      fromCache: true,
    };
  }

  try {
    const prompt = buildAdvicePrompt(
      product,
      user,
      score,
      scoreLabel,
      isAllergenAlert,
      matchedAllergens
    );

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    let parsed: { advice: string; highlights: string[] };

    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        advice: text.slice(0, 300),
        highlights: [],
      };
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    await db.insert(adviceCache).values({
      productId: product.id,
      profileClusterId,
      adviceText: parsed.advice,
      highlights: parsed.highlights,
      expiresAt,
    });

    return {
      advice: parsed.advice,
      highlights: parsed.highlights || [],
      fromCache: false,
    };
  } catch (error) {
    console.error("Gemini advice generation failed:", error);
    return {
      advice:
        "We're having trouble generating advice right now, but here's your score based on the nutrition facts.",
      highlights: [],
      fromCache: false,
    };
  }
}

function buildAdvicePrompt(
  product: Product,
  user: User,
  score: number,
  scoreLabel: string,
  isAllergenAlert: boolean,
  matchedAllergens: string[]
): string {
  const allergenWarning = isAllergenAlert
    ? `CRITICAL: This product contains allergens that match the user's allergy profile: ${matchedAllergens.join(", ")}. The score is 0 (Allergen Alert). Your advice MUST prominently warn about this allergen danger.`
    : "";

  return `You are FoodVAR's nutrition advisor. You explain food scores in a friendly, conversational way. You are warm, honest, encouraging, and never judgmental. Think of yourself as a supportive, knowledgeable friend.

${allergenWarning}

The score has already been calculated as ${score}/100 (${scoreLabel}). Do not suggest a different score. Explain why this product received this score for this user in a friendly, conversational tone.

USER PROFILE (anonymized):
- Age: ${user.age || "not specified"}
- Gender: ${user.gender || "not specified"}
- Health conditions: ${(user.conditions || []).join(", ") || "none"}
- Allergies: ${(user.allergies || []).join(", ") || "none"}
- Dietary preference: ${user.dietaryPreference || "none"}
- Goal: ${user.goal || "general wellness"}

PRODUCT: ${product.name} by ${product.brand || "Unknown brand"}
Category: ${product.category || "Unknown"}
Per serving (${product.servingSize || "standard"}):
- Calories: ${product.calories ?? "N/A"}
- Protein: ${product.protein ?? "N/A"}g
- Carbs: ${product.carbohydrates ?? "N/A"}g
- Sugar: ${product.sugar ?? "N/A"}g
- Fat: ${product.fat ?? "N/A"}g
- Saturated fat: ${product.saturatedFat ?? "N/A"}g
- Fiber: ${product.fiber ?? "N/A"}g
- Sodium: ${product.sodium ?? "N/A"}mg
- Allergens: ${(product.allergens || []).join(", ") || "none declared"}
${product.ingredients ? `\nIngredients: ${product.ingredients}` : ""}
${product.nutritionFacts ? `\nAdditional Nutrition: ${JSON.stringify(product.nutritionFacts)}` : ""}

When the user has multiple health conditions with competing nutritional priorities, acknowledge the tension and prioritize the most immediately dangerous factor.
Consider the ingredients list in your analysis - flag concerning ingredients like artificial sweeteners, hydrogenated oils, high-fructose corn syrup, excessive preservatives, or artificial colors when relevant to the user's health profile.

Respond in JSON format:
{
  "advice": "2-3 friendly sentences explaining the score and giving a practical recommendation",
  "highlights": ["array of 2-4 key nutritional factors that influenced the score, each as a short phrase"]
}`;
}

export async function extractNutritionFromImages(
  frontImageBase64: string,
  backImageBase64: string
): Promise<{
  success: boolean;
  data?: Partial<Product>;
  error?: string;
}> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are analyzing food product packaging images. Extract ALL available information from these two images (front of package and nutrition facts/ingredients label).

Extract:
1. Product name
2. Brand name
3. Category (one of: Beverages, Dairy, Snacks, Breakfast, Meals, Bakery, Frozen, Canned, Condiments, Pasta, Dairy Alternatives, Other)
4. Serving size (as text, e.g., "100g" or "1 cup (240ml)")
5. Core nutrition: Calories, Protein, Carbohydrates, Sugar, Fat, Saturated fat, Fiber, Sodium
6. Extended nutrition (if visible on label): Trans fat, Cholesterol, Potassium, Calcium, Iron, Vitamin A, Vitamin C, Vitamin D, Vitamin B12, Vitamin B6, Added sugars, Sugar alcohols, Magnesium, Zinc, Folate, Phosphorus, and ANY other nutrients shown on the label
7. Full ingredients list (the complete text as printed on the package)
8. Allergens

Return JSON format:
{
  "name": "Product Name",
  "brand": "Brand Name",
  "category": "Category",
  "servingSize": "serving size text",
  "calories": number or null,
  "protein": number or null,
  "carbohydrates": number or null,
  "sugar": number or null,
  "fat": number or null,
  "saturatedFat": number or null,
  "fiber": number or null,
  "sodium": number or null,
  "allergens": ["allergen1", "allergen2"],
  "ingredients": "Full ingredients text as printed on package, or null if not visible",
  "nutritionFacts": {
    "transFat": number or null,
    "cholesterol": number or null,
    "potassium": number or null,
    "calcium": number or null,
    "iron": number or null,
    "vitaminA": number or null,
    "vitaminC": number or null,
    "vitaminD": number or null,
    "addedSugars": number or null,
    ...any other nutrients visible on the label
  }
}

IMPORTANT RULES:
- Extract as much as you can from the images. Do your best even if the image is blurry or partially obscured.
- For any value you cannot read, use null.
- You MUST always provide the product "name" - if you cannot read it clearly, make your best guess from what is visible.
- Use the front image for name, brand, and category. Use the back image for nutrition facts and ingredients.
- Do NOT include a "confident" field. Just extract what you can.
- For the "ingredients" field, transcribe the FULL ingredients list text exactly as it appears on the packaging. Include everything.
- For "nutritionFacts", include ANY additional nutrients shown on the nutrition label beyond the core 8. Use camelCase keys (e.g., "transFat", "vitaminA", "addedSugars"). Values should be numbers (in mg for minerals/vitamins, g for macros, or % for daily values - include the unit in the key name if it's a percentage, e.g., "calciumPct": 15).

ALLERGEN RULES (CRITICAL - health safety):
- Look for allergen declarations on the packaging ("Contains:", "May contain:", "Allergens:", ingredient list bold text).
- Use ONLY these standardized allergen names: "gluten", "milk", "nuts", "soy", "shellfish", "eggs", "fish", "wheat", "peanuts", "sesame", "celery", "mustard", "lupin", "mollusks", "sulfites", "lactose".
- If you see "wheat flour" or "flour" in ingredients, include BOTH "wheat" and "gluten".
- If you see "milk", "milk powder", "whey", "casein", "butter", "cream" etc, include "milk".
- If you see "soy lecithin" or "soya", include "soy".
- EVEN IF the allergen section is not visible, INFER allergens from the product type and visible ingredients. For example: chocolate products almost always contain milk and soy; bread/pastry products contain wheat and gluten; etc.
- NEVER return an empty allergens array for processed foods. Most processed foods contain at least one common allergen.`,
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: frontImageBase64,
              },
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: backImageBase64,
              },
            },
          ],
        },
      ],
      config: {
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "";
    const parsed = JSON.parse(text);

    if (!parsed.name || parsed.name === "Unknown" || parsed.name === "") {
      return {
        success: false,
        data: parsed,
        error: "Could not identify the product. Please retake the front photo with the product name clearly visible.",
      };
    }

    delete parsed.confident;
    return { success: true, data: parsed };
  } catch (error) {
    console.error("Gemini Vision extraction failed:", error);
    return {
      success: false,
      error: "Failed to process images. Please try again.",
    };
  }
}
