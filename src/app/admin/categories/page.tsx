import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { CategoryManager } from "@/components/admin/category-manager";

export const metadata = { title: "الفئات" };

export default async function CategoriesPage() {
  const rows = await db
    .select({ c: categories, n: count(products.id) })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sort), asc(categories.id));
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-2xl font-extrabold">الفئات</h1>
      <CategoryManager cats={rows.map(({ c, n }) => ({ id: c.id, nameFr: c.nameFr, nameAr: c.nameAr, slug: c.slug, icon: c.icon, sort: c.sort, products: n }))} />
    </div>
  );
}
