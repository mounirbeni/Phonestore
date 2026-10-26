import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "./index";
import { categories, products, variants, type Category, type Product, type Variant } from "./schema";
import { artKind, type ArtKind } from "@/lib/art";

export type { Category };

export type CardProduct = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  categorySlug: string;
  categoryIcon: string;
  shortFr: string;
  shortAr: string;
  images: string[];
  isNew: boolean;
  condition: "new" | "used";
  minPrice: number;
  compareAt: number | null;
  inStock: boolean;
  colors: { hex: string; fr: string; ar: string }[];
  art: ArtKind;
};

export type SortKey = "featured" | "new" | "priceAsc" | "priceDesc" | "discount";

export type ShopFilters = {
  q?: string;
  category?: string;
  brands?: string[];
  min?: number;
  max?: number;
  inStock?: boolean;
  deals?: boolean;
  isNew?: boolean;
  condition?: "new" | "used";
  sort?: SortKey;
  page?: number;
  perPage?: number;
};

const MIN_PRICE = sql`(select min(v.price) from variants v where v.product_id = products.id)`;
const HAS_STOCK = sql`exists (select 1 from variants v where v.product_id = products.id and v.stock > 0)`;
const HAS_DEAL = sql`exists (select 1 from variants v where v.product_id = products.id and v.compare_at_price > v.price)`;
const MAX_DISCOUNT = sql`(select coalesce(max((v.compare_at_price - v.price) * 100.0 / v.compare_at_price), 0) from variants v where v.product_id = products.id and v.compare_at_price > v.price)`;

/** A category page covers the category itself and, for a family, every sub-category under it. */
const inCategory = (slug: string) =>
  sql`products.category_id in (select id from categories where slug = ${slug} or parent_id = (select id from categories where slug = ${slug}))`;

function buildWhere(f: ShopFilters): SQL {
  const conds: (SQL | undefined)[] = [eq(products.active, true)];
  if (f.category) conds.push(inCategory(f.category));
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(products.name, like), ilike(products.brand, like), ilike(products.shortFr, like), ilike(products.shortAr, like)));
  }
  if (f.brands?.length) conds.push(inArray(products.brand, f.brands));
  if (f.min != null) conds.push(sql`${MIN_PRICE} >= ${f.min}`);
  if (f.max != null) conds.push(sql`${MIN_PRICE} <= ${f.max}`);
  if (f.inStock) conds.push(HAS_STOCK);
  if (f.deals) conds.push(HAS_DEAL);
  if (f.isNew) conds.push(eq(products.isNew, true));
  if (f.condition) conds.push(eq(products.condition, f.condition));
  return and(...conds) as SQL;
}

function buildOrder(sort: SortKey = "featured"): SQL[] {
  switch (sort) {
    case "new":
      return [desc(products.createdAt), desc(products.id)];
    case "priceAsc":
      return [asc(MIN_PRICE), asc(products.id)];
    case "priceDesc":
      return [desc(MIN_PRICE), asc(products.id)];
    case "discount":
      return [desc(MAX_DISCOUNT), desc(products.createdAt)];
    default:
      return [desc(products.featured), desc(products.isNew), desc(products.createdAt), asc(products.id)];
  }
}

type Row = { p: Product; catSlug: string; catIcon: string };

async function toCards(rows: Row[]): Promise<CardProduct[]> {
  if (!rows.length) return [];
  const vs = await db
    .select()
    .from(variants)
    .where(inArray(variants.productId, rows.map((r) => r.p.id)))
    .orderBy(asc(variants.sort), asc(variants.id));
  const byProduct = new Map<number, Variant[]>();
  for (const v of vs) byProduct.set(v.productId, [...(byProduct.get(v.productId) ?? []), v]);

  return rows.map(({ p, catSlug, catIcon }) => {
    const list = byProduct.get(p.id) ?? [];
    const cheapest = [...list].sort((a, b) => a.price - b.price)[0];
    const seen = new Set<string>();
    const colors: CardProduct["colors"] = [];
    for (const v of list) {
      if (!v.colorHex || seen.has(v.colorHex)) continue;
      seen.add(v.colorHex);
      colors.push({ hex: v.colorHex, fr: v.colorFr, ar: v.colorAr });
    }
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      categorySlug: catSlug,
      categoryIcon: catIcon,
      shortFr: p.shortFr,
      shortAr: p.shortAr,
      images: p.images,
      isNew: p.isNew,
      condition: p.condition,
      minPrice: cheapest?.price ?? 0,
      compareAt: cheapest?.compareAtPrice && cheapest.compareAtPrice > cheapest.price ? cheapest.compareAtPrice : null,
      inStock: list.some((v) => v.stock > 0),
      colors: colors.slice(0, 5),
      art: artKind(p.name, catIcon),
    };
  });
}

const baseSelect = () =>
  db
    .select({ p: products, catSlug: categories.slug, catIcon: categories.icon })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id));

export async function searchProducts(f: ShopFilters) {
  const perPage = f.perPage ?? 12;
  const page = Math.max(1, f.page ?? 1);
  const where = buildWhere(f);
  const [rows, [total]] = await Promise.all([
    baseSelect()
      .where(where)
      .orderBy(...buildOrder(f.sort))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ n: count() }).from(products).where(where),
  ]);
  return { items: await toCards(rows), total: total?.n ?? 0, page, perPage, pages: Math.max(1, Math.ceil((total?.n ?? 0) / perPage)) };
}

export async function getCategories(): Promise<Category[]> {
  return db.select().from(categories).orderBy(asc(categories.sort), asc(categories.id));
}

export type CategoryWithCount = Category & { count: number };
export type CategoryNode = CategoryWithCount & { children: CategoryWithCount[] };

/** Active products per category id, leaf rows only (products never sit on a family). */
async function productCounts() {
  const rows = await db
    .select({ id: products.categoryId, n: count() })
    .from(products)
    .where(eq(products.active, true))
    .groupBy(products.categoryId);
  return new Map(rows.map((r) => [r.id, r.n]));
}

/** The storefront taxonomy: families with their sub-categories, empty ones left out. */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const [all, counts] = await Promise.all([getCategories(), productCounts()]);
  const own = (c: Category): CategoryWithCount => ({ ...c, count: counts.get(c.id) ?? 0 });
  return all
    .filter((c) => c.parentId == null)
    .map((top) => {
      const children = all.filter((c) => c.parentId === top.id).map(own).filter((c) => c.count > 0);
      return { ...own(top), count: (counts.get(top.id) ?? 0) + children.reduce((n, c) => n + c.count, 0), children };
    })
    .filter((top) => top.count > 0);
}

/** A category with the family it belongs to: its parent, the sub-categories to browse and its siblings. */
export async function getCategoryContext(slug: string) {
  const [all, counts] = await Promise.all([getCategories(), productCounts()]);
  const category = all.find((c) => c.slug === slug);
  if (!category) return null;
  const own = (c: Category): CategoryWithCount => ({ ...c, count: counts.get(c.id) ?? 0 });
  const visible = (list: Category[]) => list.map(own).filter((c) => c.count > 0);
  const parent = category.parentId == null ? null : (all.find((c) => c.id === category.parentId) ?? null);
  const children = visible(all.filter((c) => c.parentId === category.id));
  const siblings = parent ? visible(all.filter((c) => c.parentId === parent.id)) : [];
  return { category, parent, children, siblings };
}

export type CategoryContext = NonNullable<Awaited<ReturnType<typeof getCategoryContext>>>;

export async function getCategoryBySlug(slug: string) {
  const [c] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return c ?? null;
}

export async function getFacets(categorySlug?: string, condition?: "new" | "used") {
  const scope = buildWhere({ category: categorySlug, condition });
  const [brandRows, [range]] = await Promise.all([
    db
      .select({ brand: products.brand, n: count() })
      .from(products)
      .where(scope)
      .groupBy(products.brand)
      .orderBy(asc(products.brand)),
    db
      .select({ min: sql<number>`coalesce(min(${MIN_PRICE}), 0)`, max: sql<number>`coalesce(max(${MIN_PRICE}), 0)` })
      .from(products)
      .where(scope),
  ]);
  return { brands: brandRows, min: Number(range?.min ?? 0), max: Number(range?.max ?? 0) };
}

/** How many active products of each condition a category holds (drives the new/used chooser). */
export async function getConditionCounts(categorySlug: string) {
  const rows = await db
    .select({ condition: products.condition, n: count() })
    .from(products)
    .where(and(eq(products.active, true), inCategory(categorySlug)))
    .groupBy(products.condition);
  const out = { new: 0, used: 0 };
  for (const r of rows) out[r.condition] = r.n;
  return out;
}

export async function getProductDetail(slug: string) {
  const [row] = await db
    .select({ p: products, c: categories })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.slug, slug), eq(products.active, true)))
    .limit(1);
  if (!row) return null;
  const [vs, parent] = await Promise.all([
    db.select().from(variants).where(eq(variants.productId, row.p.id)).orderBy(asc(variants.sort), asc(variants.id)),
    row.c.parentId == null ? null : getCategoryById(row.c.parentId),
  ]);
  return { product: row.p, category: row.c, parent, variants: vs, art: artKind(row.p.name, row.c.icon) };
}

async function getCategoryById(id: number) {
  const [c] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  return c ?? null;
}

/** Same sub-category first; if it is thin, completed with the rest of the same family. */
export async function getRelated(productId: number, categoryId: number, limit = 4) {
  const [{ parentId } = { parentId: null }] = await db.select({ parentId: categories.parentId }).from(categories).where(eq(categories.id, categoryId)).limit(1);
  const family = parentId == null ? sql`products.category_id = ${categoryId}` : sql`products.category_id in (select id from categories where parent_id = ${parentId})`;
  const rows = await baseSelect()
    .where(and(eq(products.active, true), family, sql`${products.id} <> ${productId}`))
    .orderBy(sql`(products.category_id = ${categoryId}) desc`, desc(products.featured), desc(products.createdAt))
    .limit(limit);
  return toCards(rows);
}

export async function getProductsBySlugs(slugs: string[]) {
  if (!slugs.length) return [];
  const rows = await baseSelect().where(and(eq(products.active, true), inArray(products.slug, slugs.slice(0, 60))));
  const cards = await toCards(rows);
  const order = new Map(slugs.map((s, i) => [s, i]));
  return cards.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}

export async function getHomeData() {
  const [featured, deals, fresh, brands] = await Promise.all([
    searchProducts({ sort: "featured", perPage: 8 }).then((r) => r.items),
    searchProducts({ deals: true, sort: "discount", perPage: 8 }).then((r) => r.items),
    searchProducts({ sort: "new", perPage: 8 }).then((r) => r.items),
    db
      .select({ brand: products.brand, n: count() })
      .from(products)
      .where(eq(products.active, true))
      .groupBy(products.brand)
      .orderBy(desc(count()))
      .limit(8),
  ]);
  return { featured, deals, fresh, brands: brands.map((b) => b.brand) };
}

export async function getAllBrands() {
  return db
    .select({ brand: products.brand, n: count() })
    .from(products)
    .where(eq(products.active, true))
    .groupBy(products.brand)
    .orderBy(asc(products.brand));
}

export async function getSitemapEntries() {
  const [ps, tree] = await Promise.all([
    db.select({ slug: products.slug, at: products.createdAt }).from(products).where(eq(products.active, true)),
    getCategoryTree(),
  ]);
  return { products: ps, categories: tree.flatMap((t) => [{ slug: t.slug }, ...t.children.map((c) => ({ slug: c.slug }))]) };
}

/** Variant rows (with minimal product info) used to re-price the client cart. */
export async function getCartVariants(ids: number[]) {
  if (!ids.length) return [];
  return db
    .select({
      variantId: variants.id,
      price: variants.price,
      compareAt: variants.compareAtPrice,
      stock: variants.stock,
      colorFr: variants.colorFr,
      colorAr: variants.colorAr,
      colorHex: variants.colorHex,
      storage: variants.storage,
      slug: products.slug,
      name: products.name,
      images: products.images,
      icon: categories.icon,
      active: products.active,
    })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(inArray(variants.id, ids));
}
