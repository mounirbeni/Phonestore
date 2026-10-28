import { requirePerm } from "@/lib/auth";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { CategoryManager } from "@/components/admin/category-manager";
import { getT } from "@/lib/admin-lang";
import { PageHeader } from "@/components/admin/ui";

export async function generateMetadata() {
  const T = await getT();
  return { title: T("الفئات") };
}

export default async function CategoriesPage() {
  const T = await getT();
  await requirePerm("catalog");
  const rows = await db
    .select({ c: categories, n: count(products.id) })
    .from(categories)
    .leftJoin(products, eq(products.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sort), asc(categories.id));
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title={T("الفئات")} />
      <CategoryManager
        cats={rows.map(({ c, n }) => ({
          id: c.id, nameFr: c.nameFr, nameAr: c.nameAr, slug: c.slug, icon: c.icon, sort: c.sort, parentId: c.parentId,
          products: n, children: rows.filter((r) => r.c.parentId === c.id).length,
        }))}
      />
    </div>
  );
}
