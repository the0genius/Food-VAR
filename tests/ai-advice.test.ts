import { describe, it, expect } from "vitest";
import { getDeterministicAdvice } from "../server/ai-advice";
import type { ScoreDeduction } from "../server/scoring-engine";
import { PROMPT_VERSION, MODEL_VERSION, SCORING_VERSION } from "../server/scoring-engine";

describe("getDeterministicAdvice", () => {
  it("returns allergen alert for allergen matches", () => {
    const result = getDeterministicAdvice(0, "Allergen Alert", true, ["gluten", "nuts"], []);
    expect(result.headline).toBe("Allergen Alert");
    expect(result.advice).toContain("gluten");
    expect(result.advice).toContain("nuts");
    expect(result.advice).toContain("Avoid");
    expect(result.highlights).toEqual(["Contains: gluten", "Contains: nuts"]);
    expect(result.fromCache).toBe(false);
  });

  it("returns positive advice for high scores (75+)", () => {
    const result = getDeterministicAdvice(85, "Excellent Fit", false, [], []);
    expect(result.advice).toContain("good match");
    expect(result.coachTip).toContain("Great choice");
  });

  it("uses top bonus for high score advice", () => {
    const deductions: ScoreDeduction[] = [
      { nutrient: "fiber", value: 8, points: 5, reason: "fiber is beneficial for general nutrition", category: "bonus" },
    ];
    const result = getDeterministicAdvice(80, "Excellent Fit", false, [], deductions);
    expect(result.advice).toContain("fiber is beneficial");
  });

  it("returns moderate advice for scores 51-74", () => {
    const deductions: ScoreDeduction[] = [
      { nutrient: "sugar", value: 15, points: -8, reason: "sugar (15g) is concerning for diabetes type 2", category: "penalty" },
    ];
    const result = getDeterministicAdvice(55, "Generally Good", false, [], deductions);
    expect(result.advice).toContain("decent option");
    expect(result.coachTip).toContain("sugar");
  });

  it("returns caution advice for scores 36-50", () => {
    const result = getDeterministicAdvice(42, "Consume with Caution", false, [], []);
    expect(result.coachTip).toContain("occasional treat");
  });

  it("returns concern advice for low scores (1-35)", () => {
    const deductions: ScoreDeduction[] = [
      { nutrient: "sodium", value: 800, points: -15, reason: "sodium (800mg) is concerning for hypertension", category: "penalty" },
    ];
    const result = getDeterministicAdvice(20, "Strongly Avoid", false, [], deductions);
    expect(result.advice).toContain("sodium");
    expect(result.coachTip).toContain("alternatives");
  });

  it("includes up to 3 deduction reasons in highlights", () => {
    const deductions: ScoreDeduction[] = [
      { nutrient: "sugar", value: 30, points: -10, reason: "High sugar", category: "penalty" },
      { nutrient: "fat", value: 20, points: -8, reason: "High fat", category: "penalty" },
      { nutrient: "sodium", value: 600, points: -5, reason: "High sodium", category: "penalty" },
      { nutrient: "calories", value: 400, points: -3, reason: "High calories", category: "penalty" },
    ];
    const result = getDeterministicAdvice(30, "High Risk", false, [], deductions);
    expect(result.highlights.length).toBe(3);
  });

  it("never returns empty advice string", () => {
    const scores = [0, 1, 15, 35, 50, 74, 100];
    for (const score of scores) {
      const result = getDeterministicAdvice(score, "test", false, [], []);
      expect(result.advice.length).toBeGreaterThan(0);
      expect(result.headline.length).toBeGreaterThan(0);
    }
  });
});

describe("advice cache version awareness", () => {
  it("PROMPT_VERSION, MODEL_VERSION, and SCORING_VERSION are defined", () => {
    expect(PROMPT_VERSION).toBeDefined();
    expect(typeof PROMPT_VERSION).toBe("string");
    expect(MODEL_VERSION).toBeDefined();
    expect(typeof MODEL_VERSION).toBe("string");
    expect(SCORING_VERSION).toBeDefined();
    expect(typeof SCORING_VERSION).toBe("string");
  });

  it("advice_cache schema has scoringVersion column", async () => {
    const { adviceCache } = await import("../shared/schema");
    expect(adviceCache.scoringVersion).toBeDefined();
    expect(adviceCache.scoringVersion.name).toBe("scoring_version");
  });

  it("getAdvice source code includes version checks in cache lookup", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/ai-advice.ts", "utf-8");

    const cacheQuery = source.match(
      /const cached = await db[\s\S]*?\.limit\(1\)/
    );
    expect(cacheQuery).toBeTruthy();
    expect(cacheQuery![0]).toContain("adviceCache.promptVersion");
    expect(cacheQuery![0]).toContain("adviceCache.modelVersion");
    expect(cacheQuery![0]).toContain("adviceCache.scoringVersion");
  });

  it("cache write includes scoringVersion", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/ai-advice.ts", "utf-8");

    const cacheInsert = source.match(
      /db\.insert\(adviceCache\)\.values\([\s\S]*?\}\)/
    );
    expect(cacheInsert).toBeTruthy();
    expect(cacheInsert![0]).toContain("scoringVersion: SCORING_VERSION");
  });

  it("cache write persists headline and coachTip", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/ai-advice.ts", "utf-8");

    const cacheInsert = source.match(
      /db\.insert\(adviceCache\)\.values\([\s\S]*?\}\)/
    );
    expect(cacheInsert).toBeTruthy();
    expect(cacheInsert![0]).toContain("headline: validated.headline");
    expect(cacheInsert![0]).toContain("coachTip: validated.coachTip");
  });

  it("cache hit returns stored headline and coachTip, not empty strings", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/ai-advice.ts", "utf-8");

    const cacheHit = source.match(
      /if \(cached\.length > 0\)[\s\S]*?fromCache: true[\s\S]*?\}/
    );
    expect(cacheHit).toBeTruthy();
    expect(cacheHit![0]).toContain("cached[0].headline");
    expect(cacheHit![0]).toContain("cached[0].coachTip");
    expect(cacheHit![0]).not.toMatch(/headline:\s*""/);
    expect(cacheHit![0]).not.toMatch(/coachTip:\s*""/);
  });

  it("cache hit falls back to deterministic advice when stored fields are null", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/ai-advice.ts", "utf-8");

    const cacheHit = source.match(
      /if \(cached\.length > 0\)[\s\S]*?fromCache: true[\s\S]*?\}/
    );
    expect(cacheHit).toBeTruthy();
    expect(cacheHit![0]).toContain("getDeterministicAdvice");
    expect(cacheHit![0]).toContain("cachedFallback.headline");
    expect(cacheHit![0]).toContain("cachedFallback.coachTip");
  });

  it("advice_cache schema includes headline and coachTip columns", async () => {
    const { adviceCache } = await import("../shared/schema");
    expect(adviceCache.headline).toBeDefined();
    expect(adviceCache.headline.name).toBe("headline");
    expect(adviceCache.coachTip).toBeDefined();
    expect(adviceCache.coachTip.name).toBe("coach_tip");
  });
});

describe("extraction safety", () => {
  it("extraction prompt does not force product name guessing", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/ai-advice.ts", "utf-8");

    expect(source).not.toContain("You MUST always provide the product");
    expect(source).toContain("return null for \"name\". Do NOT guess");
  });

  it("extraction prompt requests confidence model", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/ai-advice.ts", "utf-8");

    expect(source).toContain("confidence");
    expect(source).toContain("\"high\" | \"medium\" | \"low\"");
  });

  it("ExtractionData interface includes confidence field", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/ai-advice.ts", "utf-8");

    expect(source).toContain("confidence: ExtractionConfidence | null");
  });
});

describe("history re-analysis preservation", () => {
  it("re-analysis route does NOT update scan_history row", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const reAnalysisSection = source.match(
      /if \(currentClusterId !== entryClusterId\)[\s\S]*?reAnalyzed: true/
    );
    expect(reAnalysisSection).toBeTruthy();
    expect(reAnalysisSection![0]).not.toContain(".update(scanHistory)");
  });

  it("re-analysis returns original data alongside refreshed data", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("server/routes.ts", "utf-8");

    const reAnalysisResponse = source.match(
      /reAnalyzed: true[\s\S]*?original:[\s\S]*?score: entry\.score/
    );
    expect(reAnalysisResponse).toBeTruthy();
  });
});
