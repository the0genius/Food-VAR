import { db } from "./db";
import { scoringRules, type Product, type User } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface ScoreResult {
  score: number;
  label: string;
  isAllergenAlert: boolean;
  matchedAllergens: string[];
}

function interpolate(
  value: number,
  lowerThreshold: number,
  upperThreshold: number,
  minDeduction: number,
  maxDeduction: number
): number {
  if (value <= lowerThreshold) return 0;
  if (value >= upperThreshold) return maxDeduction;
  const ratio = (value - lowerThreshold) / (upperThreshold - lowerThreshold);
  return minDeduction + ratio * (maxDeduction - minDeduction);
}

function getScoreLabel(score: number, isAllergenAlert: boolean): string {
  if (isAllergenAlert) return "Allergen Alert";
  if (score <= 25) return "Strongly Avoid";
  if (score <= 50) return "Consume with Caution";
  if (score <= 74) return "Generally Good";
  return "Excellent Fit";
}

export async function computeScore(
  product: Product,
  user: User
): Promise<ScoreResult> {
  const userAllergies = (user.allergies || []).map((a: string) =>
    a.toLowerCase()
  );
  const productAllergens = (product.allergens || []).map((a: string) =>
    a.toLowerCase()
  );

  const matchedAllergens = userAllergies.filter((allergy: string) =>
    productAllergens.includes(allergy)
  );

  if (matchedAllergens.length > 0) {
    return {
      score: 0,
      label: "Allergen Alert",
      isAllergenAlert: true,
      matchedAllergens,
    };
  }

  let score = 82;

  const rules = await db
    .select()
    .from(scoringRules)
    .where(eq(scoringRules.active, true));

  const userConditions = (user.conditions || []).map((c: string) =>
    c.toLowerCase().replace(/\s+/g, "_")
  );

  const goalKey = user.goal
    ? `goal_${user.goal.toLowerCase().replace(/\s+/g, "_")}`
    : "";

  for (const rule of rules) {
    const nutrientValue = getNutrientValue(product, rule.nutrient);
    if (nutrientValue === null) continue;

    let applies = false;

    if (rule.condition.startsWith("general_bonus")) {
      applies = true;
    } else if (rule.condition.startsWith("goal_")) {
      applies = rule.condition === goalKey;
    } else {
      applies = userConditions.includes(rule.condition);
    }

    if (!applies) continue;

    const adjustment = interpolate(
      nutrientValue,
      rule.lowerThreshold,
      rule.upperThreshold,
      rule.minDeduction,
      rule.maxDeduction
    );

    score += adjustment;
  }

  score = Math.round(Math.max(0, Math.min(100, score)));

  return {
    score,
    label: getScoreLabel(score, false),
    isAllergenAlert: false,
    matchedAllergens: [],
  };
}

function getNutrientValue(product: Product, nutrient: string): number | null {
  const mapping: Record<string, keyof Product> = {
    calories: "calories",
    protein: "protein",
    carbohydrates: "carbohydrates",
    sugar: "sugar",
    fat: "fat",
    saturatedFat: "saturatedFat",
    saturated_fat: "saturatedFat",
    fiber: "fiber",
    sodium: "sodium",
  };
  const key = mapping[nutrient];
  if (!key) return null;
  const val = product[key];
  return typeof val === "number" ? val : null;
}

export function computeClusterId(user: {
  conditions?: string[] | null;
  allergies?: string[] | null;
  dietaryPreference?: string | null;
  goal?: string | null;
}): string {
  const parts = [
    ...(user.conditions || []).sort(),
    "|",
    ...(user.allergies || []).sort(),
    "|",
    user.dietaryPreference || "none",
    "|",
    user.goal || "none",
  ];
  let hash = 0;
  const str = parts.join(",");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
