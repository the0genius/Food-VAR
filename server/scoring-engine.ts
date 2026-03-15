import { db } from "./db";
import { scoringRules, type Product, type User } from "@shared/schema";
import { eq } from "drizzle-orm";
import { ALLERGEN_GROUPS } from "./allergen-inference";

export const SCORING_VERSION = "1.0.0";
export const PROMPT_VERSION = "1.0.0";
export const MODEL_VERSION = "gemini-2.5-flash";

export interface ScoreDeduction {
  nutrient: string;
  value: number;
  points: number;
  reason: string;
  category: string;
}

export type AllergenDisplayState = "hard_alert" | "product_contains_nonmatching" | "possible_risk" | "none";

export interface ScoreResult {
  score: number;
  label: string;
  isAllergenAlert: boolean;
  matchedAllergens: string[];
  inferredAllergenWarnings: string[];
  allergenDisplayState: AllergenDisplayState;
  productDeclaredAllergens: string[];
  productInferredAllergens: string[];
  deductions: ScoreDeduction[];
  scoringVersion: string;
}

const BAD_NUTRIENTS = new Set([
  "sugar",
  "fat",
  "saturatedFat",
  "saturated_fat",
  "sodium",
  "calories",
  "carbohydrates",
]);

const GOOD_NUTRIENTS = new Set(["protein", "fiber"]);

const NUTRIENT_LABELS: Record<string, string> = {
  sugar: "sugar",
  fat: "total fat",
  saturatedFat: "saturated fat",
  saturated_fat: "saturated fat",
  sodium: "sodium",
  calories: "calories",
  carbohydrates: "carbohydrates",
  protein: "protein",
  fiber: "fiber",
};

const CONDITION_LABELS: Record<string, string> = {
  general_penalty: "general nutrition",
  general_bonus: "general nutrition",
  general_bonus_fiber: "fiber content",
  general_bonus_protein: "protein content",
  general_bonus_low_sugar: "low sugar",
  general_bonus_low_fat: "low fat",
  general_bonus_low_satfat: "low saturated fat",
  general_bonus_low_sodium: "low sodium",
  diabetes_type2: "diabetes type 2",
  diabetes_type1: "diabetes type 1",
  diabetes_type2_bonus: "diabetes type 2",
  diabetes_type1_bonus: "diabetes type 1",
  high_cholesterol: "high cholesterol",
  high_cholesterol_bonus: "high cholesterol",
  hypertension: "hypertension",
  hypertension_bonus: "hypertension",
  kidney_disease: "kidney disease",
  gout: "gout",
  ibs: "IBS",
  goal_weight_loss: "weight loss goal",
  goal_weight_loss_bonus: "weight loss goal",
  goal_muscle_gain: "muscle gain goal",
  goal_muscle_gain_bonus: "muscle gain goal",
};

export { SCORE_LABELS, SCORE_SHORT_LABELS, getScoreTier } from "@shared/score-labels";
import { SCORE_LABELS, getScoreLabel } from "@shared/score-labels";

function getConditionLabel(condition: string): string {
  if (CONDITION_LABELS[condition]) return CONDITION_LABELS[condition];
  for (const [key, label] of Object.entries(CONDITION_LABELS)) {
    if (condition.startsWith(key)) return label;
  }
  return condition.replace(/_/g, " ");
}

function penaltyInterpolate(
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

function bonusInterpolate(
  value: number,
  lowerThreshold: number,
  upperThreshold: number,
  minBonus: number,
  maxBonus: number,
  isBadNutrient: boolean
): number {
  if (isBadNutrient) {
    if (value <= lowerThreshold) return maxBonus;
    if (value >= upperThreshold) return 0;
    const ratio =
      (upperThreshold - value) / (upperThreshold - lowerThreshold);
    return minBonus + ratio * (maxBonus - minBonus);
  } else {
    if (value <= lowerThreshold) return 0;
    if (value >= upperThreshold) return maxBonus;
    const ratio = (value - lowerThreshold) / (upperThreshold - lowerThreshold);
    return minBonus + ratio * (maxBonus - minBonus);
  }
}

export { getScoreLabel } from "@shared/score-labels";

function getAllergenSources(product: Product): string[] {
  return (product.declaredAllergens || []).map((a: string) => a.toLowerCase());
}

function getInferredAllergenWarnings(
  product: Product,
  user: User,
  allergenGroups: Record<string, string[]>
): string[] {
  const userAllergies = (user.allergies || []).map((a: string) => a.toLowerCase());
  const inferredAllergens = (product.inferredAllergens || []).map((a: string) => a.toLowerCase());

  if (userAllergies.length === 0 || inferredAllergens.length === 0) return [];

  return userAllergies.filter((allergy: string) => {
    const relatedAllergens = allergenGroups[allergy] || [allergy];
    return inferredAllergens.some(
      (ia: string) =>
        relatedAllergens.includes(ia) ||
        ia === allergy ||
        (allergenGroups[ia] || []).includes(allergy)
    );
  });
}

export async function computeScore(
  product: Product,
  user: User
): Promise<ScoreResult> {

  const userAllergies = (user.allergies || []).map((a: string) =>
    a.toLowerCase()
  );
  const productAllergens = getAllergenSources(product);

  const matchedAllergens = userAllergies.filter((allergy: string) => {
    const relatedAllergens = ALLERGEN_GROUPS[allergy] || [allergy];
    return productAllergens.some(
      (pa: string) =>
        relatedAllergens.includes(pa) ||
        pa === allergy ||
        (ALLERGEN_GROUPS[pa] || []).includes(allergy)
    );
  });

  const inferredAllergenWarnings = getInferredAllergenWarnings(product, user, ALLERGEN_GROUPS);

  const productDeclaredAllergens = (product.declaredAllergens || []).map((a: string) => a.toLowerCase());
  const productInferredAllergens = (product.inferredAllergens || []).map((a: string) => a.toLowerCase());

  if (matchedAllergens.length > 0) {
    return {
      score: 0,
      label: SCORE_LABELS.ALLERGEN_ALERT,
      isAllergenAlert: true,
      matchedAllergens,
      inferredAllergenWarnings,
      allergenDisplayState: "hard_alert",
      productDeclaredAllergens,
      productInferredAllergens,
      deductions: [],
      scoringVersion: SCORING_VERSION,
    };
  }

  let score = 50;
  const deductions: ScoreDeduction[] = [];

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

    if (
      rule.condition.startsWith("general_bonus") ||
      rule.condition === "general_penalty"
    ) {
      applies = true;
    } else if (rule.condition.startsWith("goal_")) {
      applies = rule.condition === goalKey || rule.condition.startsWith(goalKey + "_");
    } else {
      applies = userConditions.some(
        (c) => rule.condition === c || rule.condition.startsWith(c + "_")
      );
    }

    if (!applies) continue;

    if (rule.isBonus) {
      const isBad = BAD_NUTRIENTS.has(rule.nutrient);
      const bonus = bonusInterpolate(
        nutrientValue,
        rule.lowerThreshold,
        rule.upperThreshold,
        rule.minDeduction,
        rule.maxDeduction,
        isBad
      );
      if (Math.abs(bonus) >= 0.1) {
        score += bonus;
        const nutrientLabel = NUTRIENT_LABELS[rule.nutrient] || rule.nutrient;
        const conditionLabel = getConditionLabel(rule.condition);
        deductions.push({
          nutrient: rule.nutrient,
          value: nutrientValue,
          points: Math.round(bonus * 10) / 10,
          reason: `${nutrientLabel} (${nutrientValue}${rule.nutrient === 'sodium' || rule.nutrient === 'calories' ? (rule.nutrient === 'sodium' ? 'mg' : '') : 'g'}) is beneficial for ${conditionLabel}`,
          category: "bonus",
        });
      }
    } else {
      const penalty = penaltyInterpolate(
        nutrientValue,
        rule.lowerThreshold,
        rule.upperThreshold,
        rule.minDeduction,
        rule.maxDeduction
      );
      if (Math.abs(penalty) >= 0.1) {
        score += penalty;
        const nutrientLabel = NUTRIENT_LABELS[rule.nutrient] || rule.nutrient;
        const conditionLabel = getConditionLabel(rule.condition);
        deductions.push({
          nutrient: rule.nutrient,
          value: nutrientValue,
          points: Math.round(penalty * 10) / 10,
          reason: `${nutrientLabel} (${nutrientValue}${rule.nutrient === 'sodium' || rule.nutrient === 'calories' ? (rule.nutrient === 'sodium' ? 'mg' : '') : 'g'}) is concerning for ${conditionLabel}`,
          category: "penalty",
        });
      }
    }
  }

  const fiberVal = getNutrientValue(product, "fiber");
  const productCategory = ((product as any).category || "").toLowerCase();
  const skipFiberPenalty = ["condiments", "sauces", "condiment", "beverages", "drinks", "beverage"].includes(productCategory);

  if (fiberVal !== null && fiberVal < 1 && !skipFiberPenalty) {
    if (userConditions.includes("high_cholesterol")) {
      score -= 2;
      deductions.push({ nutrient: "fiber", value: fiberVal, points: -2, reason: "very low fiber is concerning for high cholesterol", category: "penalty" });
    }
    if (goalKey === "goal_weight_loss") {
      score -= 1.5;
      deductions.push({ nutrient: "fiber", value: fiberVal, points: -1.5, reason: "very low fiber is concerning for weight loss goal", category: "penalty" });
    }
    if (userConditions.includes("diabetes_type2")) {
      score -= 1;
      deductions.push({ nutrient: "fiber", value: fiberVal, points: -1, reason: "very low fiber is concerning for diabetes type 2", category: "penalty" });
    }
    if (userConditions.includes("diabetes_type1")) {
      score -= 1;
      deductions.push({ nutrient: "fiber", value: fiberVal, points: -1, reason: "very low fiber is concerning for diabetes type 1", category: "penalty" });
    }
  }

  const calorieVal = getNutrientValue(product, "calories");
  const sugarVal2 = getNutrientValue(product, "sugar");
  const isZeroCalBeverage = skipFiberPenalty &&
    calorieVal !== null && calorieVal < 10 &&
    (sugarVal2 === null || sugarVal2 === 0);

  if (isZeroCalBeverage) {
    score = Math.max(score, 92);
    deductions.push({
      nutrient: "calories",
      value: calorieVal ?? 0,
      points: 0,
      reason: "near-zero calorie beverage with no sugar — excellent choice",
      category: "bonus",
    });
  }

  score = Math.round(Math.min(100, score));

  if (score < 1) {
    score = 1;
  }

  deductions.sort((a, b) => a.points - b.points);

  let allergenDisplayState: AllergenDisplayState = "none";
  if (inferredAllergenWarnings.length > 0) {
    allergenDisplayState = "possible_risk";
  } else if (productDeclaredAllergens.length > 0 || productInferredAllergens.length > 0) {
    allergenDisplayState = "product_contains_nonmatching";
  }

  return {
    score,
    label: getScoreLabel(score, false),
    isAllergenAlert: false,
    matchedAllergens: [],
    inferredAllergenWarnings,
    allergenDisplayState,
    productDeclaredAllergens,
    productInferredAllergens,
    deductions,
    scoringVersion: SCORING_VERSION,
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
