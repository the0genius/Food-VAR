import { describe, it, expect } from "vitest";
import { getScoreLabel, SCORE_LABELS, computeClusterId, SCORING_VERSION, SCORE_SHORT_LABELS, getScoreTier } from "../server/scoring-engine";
import { getScoreShortLabel, getScoreLabel as sharedGetScoreLabel, SCORE_LABELS as sharedLabels } from "../shared/score-labels";

describe("getScoreLabel", () => {
  it("returns Allergen Alert when isAllergenAlert is true", () => {
    expect(getScoreLabel(0, true)).toBe(SCORE_LABELS.ALLERGEN_ALERT);
    expect(getScoreLabel(50, true)).toBe(SCORE_LABELS.ALLERGEN_ALERT);
  });

  it("returns Strongly Avoid for score 0-15", () => {
    expect(getScoreLabel(0, false)).toBe(SCORE_LABELS.STRONGLY_AVOID);
    expect(getScoreLabel(1, false)).toBe(SCORE_LABELS.STRONGLY_AVOID);
    expect(getScoreLabel(15, false)).toBe(SCORE_LABELS.STRONGLY_AVOID);
  });

  it("returns High Risk for score 16-35", () => {
    expect(getScoreLabel(16, false)).toBe(SCORE_LABELS.HIGH_RISK);
    expect(getScoreLabel(35, false)).toBe(SCORE_LABELS.HIGH_RISK);
  });

  it("returns Caution for score 36-50", () => {
    expect(getScoreLabel(36, false)).toBe(SCORE_LABELS.CAUTION);
    expect(getScoreLabel(50, false)).toBe(SCORE_LABELS.CAUTION);
  });

  it("returns Generally Good for score 51-74", () => {
    expect(getScoreLabel(51, false)).toBe(SCORE_LABELS.GENERALLY_GOOD);
    expect(getScoreLabel(74, false)).toBe(SCORE_LABELS.GENERALLY_GOOD);
  });

  it("returns Excellent Fit for score 75-100", () => {
    expect(getScoreLabel(75, false)).toBe(SCORE_LABELS.EXCELLENT_FIT);
    expect(getScoreLabel(100, false)).toBe(SCORE_LABELS.EXCELLENT_FIT);
  });
});

describe("computeClusterId", () => {
  it("returns same hash for same profile", () => {
    const profile = {
      conditions: ["diabetes_type2"],
      allergies: ["gluten"],
      dietaryPreference: "vegan",
      goal: "weight_loss",
    };
    const id1 = computeClusterId(profile);
    const id2 = computeClusterId(profile);
    expect(id1).toBe(id2);
  });

  it("returns same hash regardless of array order", () => {
    const id1 = computeClusterId({
      conditions: ["diabetes_type2", "hypertension"],
      allergies: ["gluten", "nuts"],
      dietaryPreference: "vegan",
      goal: "weight_loss",
    });
    const id2 = computeClusterId({
      conditions: ["hypertension", "diabetes_type2"],
      allergies: ["nuts", "gluten"],
      dietaryPreference: "vegan",
      goal: "weight_loss",
    });
    expect(id1).toBe(id2);
  });

  it("returns different hash for different profiles", () => {
    const id1 = computeClusterId({
      conditions: ["diabetes_type2"],
      allergies: [],
      goal: "weight_loss",
    });
    const id2 = computeClusterId({
      conditions: ["hypertension"],
      allergies: [],
      goal: "muscle_gain",
    });
    expect(id1).not.toBe(id2);
  });

  it("handles null and undefined fields", () => {
    const id1 = computeClusterId({
      conditions: null,
      allergies: null,
      dietaryPreference: null,
      goal: null,
    });
    const id2 = computeClusterId({});
    expect(id1).toBe(id2);
  });

  it("returns a string", () => {
    const id = computeClusterId({ conditions: ["gout"], goal: "general_wellness" });
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});

describe("SCORING_VERSION", () => {
  it("is a semver string", () => {
    expect(SCORING_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("SCORE_LABELS", () => {
  it("has all expected labels", () => {
    expect(SCORE_LABELS.ALLERGEN_ALERT).toBe("Allergen Alert");
    expect(SCORE_LABELS.STRONGLY_AVOID).toBe("Strongly Avoid");
    expect(SCORE_LABELS.HIGH_RISK).toBe("High Risk");
    expect(SCORE_LABELS.CAUTION).toBe("Consume with Caution");
    expect(SCORE_LABELS.GENERALLY_GOOD).toBe("Generally Good");
    expect(SCORE_LABELS.EXCELLENT_FIT).toBe("Excellent Fit");
  });
});

describe("shared score-labels consistency", () => {
  it("backend re-exports match shared module exactly", () => {
    expect(SCORE_LABELS).toEqual(sharedLabels);
  });

  it("getScoreLabel from backend matches shared module", () => {
    const testCases = [
      { score: 0, alert: true },
      { score: 0, alert: false },
      { score: 10, alert: false },
      { score: 25, alert: false },
      { score: 40, alert: false },
      { score: 60, alert: false },
      { score: 85, alert: false },
    ];
    for (const { score, alert } of testCases) {
      expect(getScoreLabel(score, alert)).toBe(sharedGetScoreLabel(score, alert));
    }
  });

  it("every tier has both a full and short label", () => {
    const tiers = Object.keys(SCORE_LABELS) as Array<keyof typeof SCORE_LABELS>;
    for (const tier of tiers) {
      expect(SCORE_LABELS[tier]).toBeTruthy();
      expect(SCORE_SHORT_LABELS[tier]).toBeTruthy();
    }
  });

  it("getScoreShortLabel returns correct short labels for all tiers", () => {
    expect(getScoreShortLabel(0, true)).toBe("Allergen");
    expect(getScoreShortLabel(10)).toBe("Avoid");
    expect(getScoreShortLabel(25)).toBe("Risky");
    expect(getScoreShortLabel(45)).toBe("Caution");
    expect(getScoreShortLabel(65)).toBe("Good");
    expect(getScoreShortLabel(90)).toBe("Great");
  });

  it("getScoreTier returns correct tier keys", () => {
    expect(getScoreTier(0, true)).toBe("ALLERGEN_ALERT");
    expect(getScoreTier(10)).toBe("STRONGLY_AVOID");
    expect(getScoreTier(25)).toBe("HIGH_RISK");
    expect(getScoreTier(45)).toBe("CAUTION");
    expect(getScoreTier(65)).toBe("GENERALLY_GOOD");
    expect(getScoreTier(90)).toBe("EXCELLENT_FIT");
  });
});
