import type { Migration } from "./types";

type TaxonomyEntry = {
  parent: { name: string; slug: string };
  subcategory: { name: string; slug: string };
};

type ProductSnapshot = {
  _id: string | import("mongodb").ObjectId;
  name?: string;
  categoryId?: string;
  subcategoryId?: string | null;
  category?: { name: string; slug: string };
  subcategory?: { name: string; slug: string } | null;
};

const buildTaxonomy = async (db: import("mongodb").Db): Promise<Map<string, TaxonomyEntry[]>> => {
  const categories = await db
    .collection("categories")
    .find({ isDeleted: { $ne: true } })
    .toArray();
  const map = new Map<string, TaxonomyEntry[]>();

  for (const category of categories) {
    const parent = { name: String(category.name), slug: String(category.slug) };
    for (const subcategory of category.subcategories ?? []) {
      const entry = {
        parent,
        subcategory: { name: String(subcategory.name), slug: String(subcategory.slug) },
      };
      const entries = map.get(entry.subcategory.slug) ?? [];
      entries.push(entry);
      map.set(entry.subcategory.slug, entries);
    }
  }

  return map;
};

const classify = (products: ProductSnapshot[], taxonomy: Map<string, TaxonomyEntry[]>) => {
  const migrable: Array<{ product: ProductSnapshot; entry: TaxonomyEntry }> = [];
  const alreadyCorrect: ProductSnapshot[] = [];
  const ambiguous: ProductSnapshot[] = [];
  const unmatched: ProductSnapshot[] = [];

  for (const product of products) {
    const entries = taxonomy.get(product.categoryId ?? "") ?? [];
    if (entries.length === 1 && !product.subcategoryId) {
      migrable.push({ product, entry: entries[0] });
    } else if (entries.length > 1) {
      ambiguous.push(product);
    } else if (product.categoryId && taxonomyHasParent(taxonomy, product.categoryId)) {
      alreadyCorrect.push(product);
    } else {
      unmatched.push(product);
    }
  }

  return { migrable, alreadyCorrect, ambiguous, unmatched };
};

const taxonomyHasParent = (taxonomy: Map<string, TaxonomyEntry[]>, slug: string): boolean =>
  [...taxonomy.values()].some((entries) => entries.some((entry) => entry.parent.slug === slug));

const printExamples = (items: Array<{ product: ProductSnapshot; entry: TaxonomyEntry }>): void => {
  for (const { product, entry } of items.slice(0, 5)) {
    console.log("[taxonomy] before → after", {
      id: product._id,
      name: product.name,
      before: { categoryId: product.categoryId, subcategoryId: product.subcategoryId ?? null },
      after: { categoryId: entry.parent.slug, subcategoryId: entry.subcategory.slug },
    });
  }
};

export const up = async (db: import("mongodb").Db): Promise<void> => {
  const products = (await db
    .collection("products")
    .find({})
    .toArray()) as unknown as ProductSnapshot[];
  const taxonomy = await buildTaxonomy(db);
  const result = classify(products, taxonomy);

  console.log("[taxonomy] audit before", {
    total: products.length,
    migrable: result.migrable.length,
    alreadyCorrect: result.alreadyCorrect.length,
    ambiguous: result.ambiguous.length,
    unmatched: result.unmatched.length,
  });
  printExamples(result.migrable);

  for (const { product, entry } of result.migrable) {
    const filter = {
      _id: product._id,
      categoryId: product.categoryId,
      $or: [{ subcategoryId: null }, { subcategoryId: { $exists: false } }],
    } as import("mongodb").Filter<import("mongodb").Document>;
    await db.collection("products").updateOne(filter, {
      $set: {
        categoryId: entry.parent.slug,
        subcategoryId: entry.subcategory.slug,
        category: entry.parent,
        subcategory: entry.subcategory,
      },
    });
  }

  const after = (await db
    .collection("products")
    .find({})
    .toArray()) as unknown as ProductSnapshot[];
  const afterResult = classify(after, taxonomy);
  console.log("[taxonomy] audit after", {
    total: after.length,
    migrated: result.migrable.length,
    remainingLegacy: afterResult.migrable.length,
    alreadyCorrect: afterResult.alreadyCorrect.length,
    ambiguous: afterResult.ambiguous.length,
    unmatched: afterResult.unmatched.length,
  });
};

export const down = async (): Promise<void> => {
  throw new Error(
    "La migración de taxonomía no admite down automático; requiere un backup verificado",
  );
};

const migration: Migration = {
  version: 10,
  name: "normalize-product-taxonomy",
  up,
  down,
};

export default migration;
