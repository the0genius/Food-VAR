export const ALLERGEN_GROUPS: Record<string, string[]> = {
  gluten: ["gluten", "wheat", "barley", "rye", "oats"],
  wheat: ["wheat", "gluten", "flour", "semolina", "durum"],
  milk: ["milk", "dairy", "lactose", "whey", "casein", "cream", "butter", "cheese", "yogurt", "curd"],
  lactose: ["lactose", "milk", "dairy", "whey", "cream", "butter", "cheese", "yogurt"],
  nuts: ["nuts", "tree nuts", "almonds", "almond", "cashews", "cashew", "walnuts", "walnut", "hazelnuts", "hazelnut", "pecans", "pecan", "pistachios", "pistachio", "macadamia", "coconut"],
  peanuts: ["peanuts", "peanut", "peanut butter", "peanut oil"],
  soy: ["soy", "soya", "soybean", "soy lecithin", "soy flour", "soy protein"],
  eggs: ["eggs", "egg", "egg whites", "egg yolk", "albumin"],
  fish: ["fish", "cod", "salmon", "tuna", "anchovy", "anchovies"],
  shellfish: ["shellfish", "crustaceans", "shrimp", "crab", "lobster", "prawn", "crawfish"],
  sesame: ["sesame", "sesame seeds", "tahini"],
};

export function inferAllergensFromIngredients(ingredientsText: string | null | undefined): string[] {
  if (!ingredientsText || ingredientsText.trim().length === 0) {
    return [];
  }

  const normalizedText = ingredientsText.toLowerCase();
  const found = new Set<string>();

  for (const [allergenName, keywords] of Object.entries(ALLERGEN_GROUPS)) {
    for (const keyword of keywords) {
      const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (pattern.test(normalizedText)) {
        found.add(allergenName);
        break;
      }
    }
  }

  return Array.from(found).sort();
}
