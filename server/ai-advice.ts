import { GoogleGenAI } from "@google/genai";
import { db } from "./db";
import { adviceCache, type Product, type User } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";
import type { ScoreDeduction } from "./scoring-engine";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

interface AdviceResult {
  advice: string;
  headline: string;
  coachTip: string;
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
  matchedAllergens: string[],
  deductions: ScoreDeduction[] = []
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
      headline: "",
      coachTip: "",
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
      matchedAllergens,
      deductions
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
    let rawParsed: any;

    try {
      rawParsed = JSON.parse(text);
    } catch {
      rawParsed = {
        headline: "",
        whyText: text.slice(0, 200),
        coachTip: "",
        highlights: [],
      };
    }

    const adviceText = rawParsed.whyText || rawParsed.advice || "";
    const headline = rawParsed.headline || "";
    const coachTip = rawParsed.coachTip || "";
    const highlights = rawParsed.highlights || [];

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    await db.insert(adviceCache).values({
      productId: product.id,
      profileClusterId,
      adviceText: adviceText,
      highlights: highlights,
      expiresAt,
    });

    return {
      advice: adviceText,
      headline,
      coachTip,
      highlights,
      fromCache: false,
    };
  } catch (error) {
    console.error("Gemini advice generation failed:", error);
    return {
      advice:
        "We're having trouble generating advice right now, but here's your score based on the nutrition facts.",
      headline: "",
      coachTip: "",
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
  matchedAllergens: string[],
  deductions: ScoreDeduction[] = []
): string {
  const allergenWarning = isAllergenAlert
    ? `CRITICAL ALLERGEN ALERT: This product contains ${matchedAllergens.join(", ")} which matches the user's allergies. Score is 0. Your headline MUST warn about this allergen danger. The whyText should explain the risk.`
    : "";

  const penalties = deductions.filter(d => d.category === "penalty");
  const bonuses = deductions.filter(d => d.category === "bonus");

  const topPenalties = penalties.slice(0, 5);
  const topBonuses = bonuses.sort((a, b) => b.points - a.points).slice(0, 4);

  const penaltyBreakdown = topPenalties.length > 0
    ? `What pulled the score down:\n${topPenalties.map(d => `  - ${d.reason}: ${d.points} pts`).join("\n")}`
    : "No significant penalties.";

  const bonusBreakdown = topBonuses.length > 0
    ? `What helped the score:\n${topBonuses.map(d => `  - ${d.reason}: +${d.points} pts`).join("\n")}`
    : "No significant bonuses.";

  const category = (product.category || "").toLowerCase();
  const isCondiment = ["condiments", "sauces", "condiment"].includes(category);
  const isBeverage = ["beverages", "drinks", "beverage"].includes(category);

  const categoryGuidance = isCondiment
    ? `IMPORTANT: This is a CONDIMENT. Do NOT criticize it for low protein, low fiber, or low calories — that's expected. Focus ONLY on sugar and sodium content as the key factors.`
    : isBeverage
    ? `IMPORTANT: This is a BEVERAGE. Do NOT criticize it for low protein or low fiber. Focus on sugar, calories, and sodium.`
    : "";

  const conditions = (user.conditions || []).join(", ") || "none";
  const goal = user.goal || "general wellness";

  return `You are FoodVAR — a warm, direct nutrition coach who talks like a smart friend, not a doctor.

${allergenWarning}

PRODUCT: ${product.name} (${product.category || "Food"})
Score: ${score}/100
User's conditions: ${conditions}
User's goal: ${goal}

${categoryGuidance}

SCORING DATA:
${penaltyBreakdown}
${bonusBreakdown}

Nutrition per serving (${product.servingSize || "standard serving"}):
Cal ${product.calories ?? "?"} | Protein ${product.protein ?? "?"}g | Carbs ${product.carbohydrates ?? "?"}g | Sugar ${product.sugar ?? "?"}g | Fat ${product.fat ?? "?"}g | Sat.Fat ${product.saturatedFat ?? "?"}g | Fiber ${product.fiber ?? "?"}g | Sodium ${product.sodium ?? "?"}mg
${product.ingredients ? `Ingredients: ${product.ingredients}` : ""}

YOUR RULES:
1. NEVER start with "This [product name] scored X/100" — the user already sees the score on screen
2. NEVER use words like: "penalties," "deductions," "mitigate," "adhere," "consume with caution"
3. Keep the whyText to MAX 2-3 short sentences. Be punchy, not verbose.
4. The coachTip should be ONE specific, actionable swap or hack (e.g., "Try mustard instead — zero sugar, same kick")
5. Talk like a knowledgeable friend, not a medical textbook
6. ${categoryGuidance || "Judge the food fairly for what it is"}
7. The headline should capture the #1 insight in 2-5 words (e.g., "Hidden sugar alert", "Great protein pick", "Watch the sodium")
8. NO DATA DUMPS: Do NOT repeat specific gram/mg counts in the whyText (e.g., "contains 3.4g sugar" or "160mg of sodium"). The user sees the Nutrition Facts table right below. Instead use comparative language: "high sugar," "surprisingly salty," "nearly a teaspoon of sugar per tablespoon," "empty calories." Make it vivid, not clinical.
9. ZERO-CAL BEVERAGES: If a product has < 10 calories and 0g sugar (black coffee, tea, water, diet drinks), the headline should be positive (e.g., "Great daily choice", "Smart pick"). Do not flag missing nutrients.
10. RULE OF ONE: Focus on the SINGLE biggest factor in the whyText. Do NOT list sugar AND sodium AND fat AND fiber all in one paragraph. Pick the #1 concern (or benefit) and explain it compellingly. MAX 2 sentences in whyText. The highlights tags handle the secondary factors.
11. HEADLINE TONE MATCH: If you flag a concern for the user's specific condition (e.g., carbs for diabetics, sodium for hypertension), the headline MUST sound cautionary — use words like "watch," "mind," "alert," "careful." Never write an encouraging headline when flagging a condition concern.

Respond in JSON:
{
  "headline": "2-5 word catchy summary of the key finding (e.g., 'High sugar spike', 'Solid protein choice', 'Sodium overload')",
  "whyText": "2-3 sentences max. Jump straight into WHY — what's the main trade-off? What should they know? Be specific to their conditions.",
  "coachTip": "One specific swap, hack, or portion tip. Not generic advice.",
  "highlights": ["2-3 SHORT tags, e.g., 'Sugar: 3.4g per tbsp', 'Zero fiber (normal for ketchup)', 'Low sodium: 160mg'"]
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
