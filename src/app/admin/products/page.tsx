import Link from "next/link";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { eur } from "@/lib/admin-ui";
import { artKind } from "@/lib/art";
import { ProductVisual } from "@/components/ui/product-visual";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "المنتجات" };
const PER = 25;

type Props = { searchParams: Promise<{ q?: string; page?: string }> };

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 60);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const conds: (SQL | undefined)[] = [];
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(products.name, like), ilike(products.brand, like), ilike(products.slug, like)));
  }
  const where = and(...conds);

  const [rows, [total]] = await Promise.all([
    db
      .select({
        p: products,
        cat: categories.nameAr,
        icon: categories.icon,
        minPrice: sql<number>`(select min(price) from variants where product_id = products.id)`,
        maxPrice: sql<number>`(select max(price) from variants where product_id = products.id)`,
        stock: sql<number>`(select coalesce(sum(stock), 0)::int from variants where product_id = products.id)`,
        nVariants: sql<number>`(select count(*)::int from variants where product_id = products.id)`,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(where)
      .orderBy(desc(products.createdAt), asc(products.id))
      .limit(PER)
      .offset((page - 1) * PER),
    db.select({ n: count() }).from(products).where(where),
  ]);
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PER));
  const href = (p: number) => `/admin/products?${new URLSearchParams({ ...(q ? { q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">المنتجات <span className="text-base font-medium text-muted">({total?.n ?? 0})</span></h1>
        <form action="/admin/products" className="ms-auto flex gap-2">
          <input name="q" defaultValue={q} placeholder="ابحث بالاسم أو العلامة…" className="input !w-56 !py-2 text-sm" aria-label="بحث" />
          <button className="btn btn-outline btn-sm" type="submit">بحث</button>
        </form>
        <Link href="/admin/products/new" className="btn btn-brand btn-sm"><Plus className="h-4 w-4" aria-hidden="true" />منتج جديد</Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line bg-mist/60">
              <th className="px-5 py-2.5 text-start font-medium">المنتج</th>
              <th className="hidden px-3 py-2.5 text-start font-medium md:table-cell">الفئة</th>
              <th className="px-3 py-2.5 text-start font-medium">السعر</th>
              <th className="px-3 py-2.5 text-start font-medium">المخزون</th>
              <th className="hidden px-3 py-2.5 text-start font-medium sm:table-cell">الحالة</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map(({ p, cat, icon, minPrice, maxPrice, stock, nVariants }) => (
              <tr key={p.id} className="hover:bg-mist/50">
                <td className="px-5 py-3">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                    <span className="h-11 w-11 shrink-0 rounded-xl bg-mist p-1"><ProductVisual image={p.images[0]} art={artKind(p.name, icon)} alt="" /></span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold hover:text-brand" dir="ltr">{p.name}</span>
                      <span className="block text-xs text-muted" dir="ltr">{p.brand} · {nVariants} خيار</span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-3 py-3 md:table-cell">{cat}</td>
                <td className="px-3 py-3 font-semibold tabular-nums" dir="ltr" style={{ textAlign: "right" }}>{minPrice === maxPrice ? eur(minPrice) : `${eur(minPrice)} – ${eur(maxPrice)}`}</td>
                <td className="px-3 py-3"><span className={cn("chip", stock === 0 ? "bg-hot-50 text-hot" : stock <= 5 ? "bg-[#fff7e6] text-[#b26a00]" : "bg-ok-50 text-ok")}>{stock === 0 ? "نفد" : stock}</span></td>
                <td className="hidden px-3 py-3 sm:table-cell"><span className={cn("chip", p.active ? "bg-ok-50 text-ok" : "bg-mist text-muted")}>{p.active ? "منشور" : "مخفي"}</span></td>
                <td className="px-3 py-3"><ProductRowActions id={p.id} active={p.active} name={p.name} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-5 py-14 text-center text-muted">لا توجد منتجات</td></tr>}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="btn btn-outline btn-sm" href={href(page - 1)}>السابق</Link>}
          <span className="text-muted">صفحة {page} من {pages}</span>
          {page < pages && <Link className="btn btn-outline btn-sm" href={href(page + 1)}>التالي</Link>}
        </nav>
      )}
    </div>
  );
}
