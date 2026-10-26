import { readFileSync } from "node:fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, notInArray } from "drizzle-orm";
import * as s from "../src/db/schema";
import { slugify } from "../src/lib/utils";

type Cat = { slug: string; nameFr: string; nameAr: string; icon: string; sort: number; parent: string | null };
type Var = { colorFr: string; colorAr: string; colorHex: string; storage: string; price: number; compare: number | null; available: boolean };
type Item = {
  name: string;
  brand: string;
  cat: string;
  condition: "new" | "used";
  specs: { fr: string; ar: string; value: string }[];
  createdAt: string;
  desc: string[];
  optionLabelFr: string;
  optionLabelAr: string;
  variants: Var[];
};

/** The catalogue publishes availability only, not quantities: an available variant gets this stock. */
const DEFAULT_STOCK = 10;
const SKU_START = 2000;

const summary = (paragraphs: string[], name: string) => {
  const p = paragraphs.find((x) => x.length >= 60 && x !== name) ?? "";
  if (p.length <= 180) return p;
  return `${p.slice(0, 180).replace(/\s+\S*$/, "")}…`;
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const { categories, products }: { categories: Cat[]; products: Item[] } = JSON.parse(readFileSync("data/catalog.json", "utf8"));
  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema: s });

  await db.transaction(async (tx) => {
    const id = new Map<string, number>();
    for (const c of categories) {
      const values = { nameFr: c.nameFr, nameAr: c.nameAr, icon: c.icon, sort: c.sort, parentId: c.parent ? id.get(c.parent)! : null };
      const [row] = await tx.select({ id: s.categories.id }).from(s.categories).where(eq(s.categories.slug, c.slug)).limit(1);
      if (row) {
        await tx.update(s.categories).set(values).where(eq(s.categories.id, row.id));
        id.set(c.slug, row.id);
      } else {
        const [made] = await tx.insert(s.categories).values({ slug: c.slug, ...values }).returning({ id: s.categories.id });
        id.set(c.slug, made.id);
      }
    }

    const used = new Set<string>();
    const slugs: string[] = [];
    let sku = SKU_START;
    for (const p of products) {
      const base = slugify(p.name) || "produit";
      let slug = base;
      for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
      used.add(slug);
      slugs.push(slug);

      const text = p.desc.join("\n\n");
      const values = {
        name: p.name,
        brand: p.brand,
        categoryId: id.get(p.cat)!,
        shortFr: summary(p.desc, p.name),
        descFr: text,
        specs: p.specs,
        condition: p.condition,
        warrantyMonths: p.condition === "used" ? 12 : 24,
        optionLabelFr: p.optionLabelFr,
        optionLabelAr: p.optionLabelAr,
        active: true,
        createdAt: new Date(p.createdAt.replace(" ", "T")),
      };
      const [exists] = await tx.select({ id: s.products.id }).from(s.products).where(eq(s.products.slug, slug)).limit(1);
      let productId: number;
      if (exists) {
        await tx.update(s.products).set(values).where(eq(s.products.id, exists.id));
        productId = exists.id;
      } else {
        const [made] = await tx.insert(s.products).values({ slug, ...values }).returning({ id: s.products.id });
        productId = made.id;
      }

      const codes: string[] = [];
      for (const [i, v] of p.variants.entries()) {
        const row = {
          productId,
          colorFr: v.colorFr,
          colorAr: v.colorAr,
          colorHex: v.colorHex,
          storage: v.storage,
          price: v.price,
          compareAtPrice: v.compare,
          stock: v.available ? DEFAULT_STOCK : 0,
          sort: i,
        };
        const code = `ES-${sku++}`;
        codes.push(code);
        const [have] = await tx.select({ id: s.variants.id }).from(s.variants).where(eq(s.variants.sku, code)).limit(1);
        if (have) await tx.update(s.variants).set(row).where(eq(s.variants.id, have.id));
        else await tx.insert(s.variants).values({ sku: code, ...row });
      }
      // A product reused from before (same slug) may carry old variants.
      await tx.delete(s.variants).where(and(eq(s.variants.productId, productId), notInArray(s.variants.sku, codes)));
    }

    // Anything not in the catalogue (the former demo products) is archived, not deleted.
    if (process.argv.includes("--archive-others")) {
      const archived = await tx
        .update(s.products)
        .set({ active: false })
        .where(and(eq(s.products.active, true), notInArray(s.products.slug, slugs)))
        .returning({ id: s.products.id });
      console.log(`Archived ${archived.length} products outside the catalogue`);
    }
    console.log(`Imported ${products.length} products in ${categories.length} categories`);
  });
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
