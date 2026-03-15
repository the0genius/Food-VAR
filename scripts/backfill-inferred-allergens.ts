import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq, sql, and, isNotNull } from "drizzle-orm";
import { inferAllergensFromIngredients } from "../server/allergen-inference";

async function backfill() {
  console.log("Backfilling inferred allergens from ingredients...");

  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      ingredients: products.ingredients,
      inferredAllergens: products.inferredAllergens,
    })
    .from(products)
    .where(
      and(
        isNotNull(products.ingredients),
        sql`${products.ingredients} != ''`
      )
    );

  let updated = 0;
  let skipped = 0;

  for (const product of allProducts) {
    const inferred = inferAllergensFromIngredients(product.ingredients);

    const existingInferred = (product.inferredAllergens || []) as string[];
    if (
      inferred.length === existingInferred.length &&
      inferred.every((a) => existingInferred.includes(a))
    ) {
      skipped++;
      continue;
    }

    await db
      .update(products)
      .set({ inferredAllergens: inferred })
      .where(eq(products.id, product.id));

    console.log(
      `  Updated "${product.name}": [${inferred.join(", ")}]`
    );
    updated++;
  }

  console.log(
    `Done. Updated: ${updated}, Skipped (already correct): ${skipped}, Total with ingredients: ${allProducts.length}`
  );
  process.exit(0);
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
