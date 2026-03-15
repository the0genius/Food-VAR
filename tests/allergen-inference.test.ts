import { describe, it, expect } from "vitest";
import { inferAllergensFromIngredients, ALLERGEN_GROUPS } from "../server/allergen-inference";

describe("inferAllergensFromIngredients", () => {
  it("returns empty array for null/undefined/empty input", () => {
    expect(inferAllergensFromIngredients(null)).toEqual([]);
    expect(inferAllergensFromIngredients(undefined)).toEqual([]);
    expect(inferAllergensFromIngredients("")).toEqual([]);
    expect(inferAllergensFromIngredients("   ")).toEqual([]);
  });

  it("detects milk/lactose from dairy ingredients", () => {
    const result = inferAllergensFromIngredients(
      "Cheddar cheese, milk, whey, milkfat, milk protein concentrate, salt"
    );
    expect(result).toContain("milk");
    expect(result).toContain("lactose");
  });

  it("detects wheat/gluten from flour-based ingredients", () => {
    const result = inferAllergensFromIngredients(
      "Enriched wheat flour, sugar, palm oil, cocoa"
    );
    expect(result).toContain("wheat");
    expect(result).toContain("gluten");
  });

  it("detects soy from soy lecithin", () => {
    const result = inferAllergensFromIngredients(
      "Sugar, cocoa butter, chocolate liquor, soy lecithin, vanilla"
    );
    expect(result).toContain("soy");
  });

  it("detects peanuts", () => {
    const result = inferAllergensFromIngredients(
      "Roasted peanuts, sugar, salt, hydrogenated vegetable oils"
    );
    expect(result).toContain("peanuts");
  });

  it("detects eggs", () => {
    const result = inferAllergensFromIngredients(
      "Enriched flour, sugar, egg whites, palm oil, baking soda"
    );
    expect(result).toContain("eggs");
  });

  it("detects nuts from almonds", () => {
    const result = inferAllergensFromIngredients(
      "Almonds, honey, oats, rice flour"
    );
    expect(result).toContain("nuts");
  });

  it("detects sesame", () => {
    const result = inferAllergensFromIngredients(
      "Chickpeas, tahini, olive oil, lemon juice, garlic"
    );
    expect(result).toContain("sesame");
  });

  it("detects multiple allergens in complex ingredient lists", () => {
    const result = inferAllergensFromIngredients(
      "Whole grain oats, sugar, canola oil, yellow corn flour, honey, soy flour, brown sugar syrup, salt, soy lecithin, baking soda, natural flavor"
    );
    expect(result).toContain("gluten");
    expect(result).toContain("soy");
  });

  it("returns sorted results", () => {
    const result = inferAllergensFromIngredients(
      "Wheat flour, milk, eggs, soy lecithin, peanut butter"
    );
    const sorted = [...result].sort();
    expect(result).toEqual(sorted);
  });

  it("does not false-positive on unrelated words", () => {
    const result = inferAllergensFromIngredients(
      "Water, sugar, citric acid, natural flavors, potassium sorbate"
    );
    expect(result).toEqual([]);
  });

  it("handles case-insensitive matching", () => {
    const result = inferAllergensFromIngredients(
      "WHEAT FLOUR, MILK, SOY LECITHIN"
    );
    expect(result).toContain("wheat");
    expect(result).toContain("milk");
    expect(result).toContain("soy");
  });
});

describe("ALLERGEN_GROUPS", () => {
  it("covers all major allergen categories", () => {
    const expected = ["gluten", "wheat", "milk", "lactose", "nuts", "peanuts", "soy", "eggs", "fish", "shellfish", "sesame"];
    for (const allergen of expected) {
      expect(ALLERGEN_GROUPS).toHaveProperty(allergen);
    }
  });

  it("each group has at least one keyword", () => {
    for (const [name, keywords] of Object.entries(ALLERGEN_GROUPS)) {
      expect(keywords.length).toBeGreaterThan(0);
    }
  });
});
