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

When the user has multiple health conditions with competing nutritional priorities, acknowledge the tension and prioritize the most immediately dangerous factor.

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
              text: `You are analyzing food product packaging images. Extract the following information from these two images (front of package and nutrition facts label):

1. Product name
2. Brand name
3. Category (one of: Beverages, Dairy, Snacks, Breakfast, Meals, Bakery, Frozen, Canned, Condiments, Pasta, Dairy Alternatives, Other)
4. Serving size (as text, e.g., "100g" or "1 cup (240ml)")
5. Calories (number)
6. Protein in grams (number)
7. Carbohydrates in grams (number)
8. Sugar in grams (number)
9. Fat in grams (number)
10. Saturated fat in grams (number)
11. Fiber in grams (number)
12. Sodium in milligrams (number)
13. Allergens (array of strings from: gluten, lactose, nuts, soy, shellfish, eggs, fish, wheat, peanuts)

Return JSON format:
{
  "confident": true/false,
  "name": "Product Name",
  "brand": "Brand Name",
  "category": "Category",
  "servingSize": "serving size text",
  "calories": number,
  "protein": number,
  "carbohydrates": number,
  "sugar": number,
  "fat": number,
  "saturatedFat": number,
  "fiber": number,
  "sodium": number,
  "allergens": ["allergen1", "allergen2"]
}

If any value cannot be extracted confidently, set "confident" to false and include what you can extract.`,
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

    if (!parsed.confident) {
      return {
        success: false,
        data: parsed,
        error: "Could not extract all values confidently. Please retake the photos.",
      };
    }

    return { success: true, data: parsed };
  } catch (error) {
    console.error("Gemini Vision extraction failed:", error);
    return {
      success: false,
      error: "Failed to process images. Please try again.",
    };
  }
}
