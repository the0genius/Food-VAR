export const SCORE_LABELS = {
  ALLERGEN_ALERT: "Allergen Alert",
  STRONGLY_AVOID: "Strongly Avoid",
  HIGH_RISK: "High Risk",
  CAUTION: "Consume with Caution",
  GENERALLY_GOOD: "Generally Good",
  EXCELLENT_FIT: "Excellent Fit",
} as const;

export const SCORE_SHORT_LABELS = {
  ALLERGEN_ALERT: "Allergen",
  STRONGLY_AVOID: "Avoid",
  HIGH_RISK: "Risky",
  CAUTION: "Caution",
  GENERALLY_GOOD: "Good",
  EXCELLENT_FIT: "Great",
} as const;

export type ScoreTier =
  | "ALLERGEN_ALERT"
  | "STRONGLY_AVOID"
  | "HIGH_RISK"
  | "CAUTION"
  | "GENERALLY_GOOD"
  | "EXCELLENT_FIT";

export function getScoreTier(score: number, isAllergenAlert?: boolean): ScoreTier {
  if (isAllergenAlert) return "ALLERGEN_ALERT";
  if (score <= 15) return "STRONGLY_AVOID";
  if (score <= 35) return "HIGH_RISK";
  if (score <= 50) return "CAUTION";
  if (score <= 74) return "GENERALLY_GOOD";
  return "EXCELLENT_FIT";
}

export function getScoreLabel(score: number, isAllergenAlert?: boolean): string {
  return SCORE_LABELS[getScoreTier(score, isAllergenAlert)];
}

export function getScoreShortLabel(score: number, isAllergenAlert?: boolean): string {
  return SCORE_SHORT_LABELS[getScoreTier(score, isAllergenAlert)];
}
