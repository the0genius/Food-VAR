import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq, sql, and, isNull, or } from "drizzle-orm";
import { inferAllergensFromIngredients } from "../server/allergen-inference";

const INGREDIENT_DATA: Record<string, string> = {
  "Weetabix Original":
    "Whole grain wheat (95%), malted barley extract, sugar, salt, niacin, iron, thiamin, riboflavin, folic acid",
  "Kinder Bueno":
    "Sugar, palm oil, hazelnuts (13%), skimmed milk powder, wheat flour, cocoa butter, cocoa mass, emulsifier lecithins (soy), vanillin, sodium bicarbonate",
  "Kinder bueno":
    "Sugar, palm oil, hazelnuts (13%), skimmed milk powder, wheat flour, cocoa butter, cocoa mass, emulsifier lecithins (soy), vanillin, sodium bicarbonate",
  "Cadbury Dairy Milk":
    "Milk, sugar, cocoa butter, cocoa mass, vegetable fats (palm, shea), emulsifiers (E442, E476), flavourings",
  "Alpro Soy Milk":
    "Water, hulled soya beans (8.7%), sugar, calcium carbonate, acidity regulators, sea salt, stabiliser, vitamins (B12, B2, D2)",
  "Barilla Spaghetti":
    "Durum wheat semolina, water",
  "Nissin Cup Noodles":
    "Enriched wheat flour (wheat flour, niacin, reduced iron, thiamine mononitrate, riboflavin, folic acid), palm oil, salt, soy sauce (water, wheat, soybeans, salt), sugar, monosodium glutamate, dehydrated vegetables, spices",
  "Huel Black Edition Shake":
    "Pea protein, oats, flaxseed, brown rice protein, sunflower oil powder, coconut sugar, MCT powder, tapioca starch, vitamins and minerals, natural flavourings, soy lecithin, sweetener (sucralose)",
  "KIND Almond & Coconut Bar":
    "Almonds, coconut, honey, glucose syrup, sugar, palm kernel oil, rice flour, soy lecithin, salt, natural flavour",
  "Grenade Protein Bar":
    "Milk protein, humectant (glycerol), oligofructose, collagen hydrolysate, palm oil, soy protein isolate, cocoa butter, sugar, emulsifier (soy lecithin), sweetener (sucralose), almonds, hazelnuts, peanuts",
  "Kelloggs Special K":
    "Rice, wheat gluten, sugar, defatted wheat germ, salt, malt flavouring, iron, niacinamide, vitamin B6, vitamin B2, vitamin B1, folic acid, vitamin D, vitamin B12",
  "Oreo Original":
    "Wheat flour, sugar, palm oil, fat-reduced cocoa powder, wheat starch, glucose-fructose syrup, raising agents (potassium bicarbonate, sodium bicarbonate, ammonium bicarbonate), salt, emulsifier (soya lecithin), flavouring (vanillin)",
  "Chobani Greek Yogurt":
    "Cultured low fat milk, cream",
  "Nature Valley Granola Bar":
    "Whole grain oats, sugar, canola oil, rice flour, honey, salt, brown sugar syrup, soy lecithin, baking soda, natural flavour, almonds",
  "Yakult Original":
    "Water, skimmed milk, glucose-fructose syrup, sugar, lactobacillus casei shirota",
  "Quaker Oats":
    "100% rolled oats",
  "Haribo Gold Bears":
    "Glucose syrup, sugar, gelatin, dextrose, citric acid, fruit and plant concentrates (apple, lemon, orange, elderberry, strawberry, raspberry, kiwi, mango, passion fruit, grape), flavourings, glazing agents (beeswax, carnauba wax)",
  "Heinz Tomato Ketchup":
    "Tomatoes (148g per 100g ketchup), spirit vinegar, sugar, salt, spice and herb extracts, spice",
  "Innocent Strawberry Smoothie":
    "Crushed fruit (strawberries 49%, bananas 27%, apples 20%), orange juice 4%",
  "Coca-Cola Classic":
    "Carbonated water, sugar, colour (caramel E150d), phosphoric acid, natural flavourings including caffeine",
  "Naked Green Machine Smoothie":
    "Apple juice, mango puree, pineapple juice, banana puree, kiwi puree, spirulina, natural flavours, broccoli, spinach, blue green algae, garlic, ginger, barley grass, wheat grass, parsley, odourless garlic",
  "Nescafe Gold":
    "Spray-dried instant coffee, finely ground roasted coffee",
  "Plain White Rice":
    "Long grain white rice",
  "Test Cereal":
    "Whole grain wheat, sugar, corn syrup, salt",
  "Test Organic Granola":
    "Organic rolled oats, organic honey, organic coconut oil, organic almonds, organic pumpkin seeds, organic sunflower seeds, salt",
  "Test Plain Rice":
    "Long grain white rice",
  "Gluten-Free Uncured Beef Corn Dogs":
    "Beef, water, corn flour, rice flour, sugar, salt, vinegar, garlic powder, onion powder, spices, paprika, egg whites, soybean oil",
};

async function fixAllergenMismatch() {
  console.log("Step 1: Copying allergens → declaredAllergens where declaredAllergens is empty...");

  const mismatchedProducts = await db
    .select({
      id: products.id,
      name: products.name,
      allergens: products.allergens,
      declaredAllergens: products.declaredAllergens,
      ingredients: products.ingredients,
    })
    .from(products)
    .where(
      and(
        or(
          sql`${products.declaredAllergens}::text = '[]'`,
          isNull(products.declaredAllergens)
        ),
        sql`${products.allergens}::text != '[]'`,
        sql`${products.allergens} IS NOT NULL`
      )
    );

  let allergenFixed = 0;
  for (const product of mismatchedProducts) {
    const allergens = (product.allergens || []) as string[];
    await db
      .update(products)
      .set({ declaredAllergens: allergens })
      .where(eq(products.id, product.id));
    console.log(`  Fixed "${product.name}": declaredAllergens = [${allergens.join(", ")}]`);
    allergenFixed++;
  }
  console.log(`  → ${allergenFixed} products fixed.\n`);

  console.log("Step 2: Adding ingredients for products missing them...");

  const missingIngredients = await db
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(
      or(
        isNull(products.ingredients),
        sql`${products.ingredients} = ''`
      )
    );

  let ingredientsAdded = 0;
  for (const product of missingIngredients) {
    const ingredientText = INGREDIENT_DATA[product.name];
    if (ingredientText) {
      const inferred = inferAllergensFromIngredients(ingredientText);
      await db
        .update(products)
        .set({
          ingredients: ingredientText,
          inferredAllergens: inferred,
        })
        .where(eq(products.id, product.id));
      console.log(`  Added ingredients for "${product.name}" → inferred: [${inferred.join(", ")}]`);
      ingredientsAdded++;
    } else {
      console.log(`  ⚠ No ingredient data available for "${product.name}"`);
    }
  }
  console.log(`  → ${ingredientsAdded} products updated with ingredients.\n`);

  console.log("Step 3: Recomputing inferredAllergens for all products with ingredients...");

  const allWithIngredients = await db
    .select({
      id: products.id,
      name: products.name,
      ingredients: products.ingredients,
      inferredAllergens: products.inferredAllergens,
    })
    .from(products)
    .where(
      and(
        sql`${products.ingredients} IS NOT NULL`,
        sql`${products.ingredients} != ''`
      )
    );

  let inferredUpdated = 0;
  for (const product of allWithIngredients) {
    const inferred = inferAllergensFromIngredients(product.ingredients);
    const existing = (product.inferredAllergens || []) as string[];
    if (
      inferred.length !== existing.length ||
      !inferred.every((a) => existing.includes(a))
    ) {
      await db
        .update(products)
        .set({ inferredAllergens: inferred })
        .where(eq(products.id, product.id));
      console.log(`  Recomputed "${product.name}": [${inferred.join(", ")}]`);
      inferredUpdated++;
    }
  }
  console.log(`  → ${inferredUpdated} products had inferredAllergens updated.\n`);

  console.log("Done!");
  process.exit(0);
}

fixAllergenMismatch().catch((err) => {
  console.error("Fix failed:", err);
  process.exit(1);
});
