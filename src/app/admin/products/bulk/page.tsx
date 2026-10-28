import Link from "next/link";
import { and, asc, count, eq, ilike, lte, or, type SQL } from "drizzle-orm";
import { Search } from "lucide-react";
import { db } from "@/db";
import { products, variants } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { getT } from "@/lib/admin-lang";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";
import { BulkEditor, BulkFileTools } from "@/components/admin/bulk-editor";
import { activeStores, stockByStore } from "@/lib/stock";

export async function generateMetadata() {
  const T = await getT();
  return { title: T("المخزون والأسعار") };
}

const PER = 60;
type Props = { searchParams: Promise<{ q?: string; low?: string; page?: string }> };

export default async function BulkPage({ searchParams }: Props) {
  const T = await getT();
  await requirePerm("catalog");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 60) ?? "";
  const low = sp.low === "1";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const conds: (SQL | undefined)[] = [low ? lte(variants.stock, 3) : undefined];
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(products.name, like), ilike(products.brand, like), ilike(variants.sku, like)));
  }
  const where = and(...conds);
  const [rows, [total]] = await Promise.all([
    db
      .select({ id: variants.id, sku: variants.sku, color: variants.colorFr, storage: variants.storage, price: variants.price, compareAt: variants.compareAtPrice, stock: variants.stock, name: products.name, productId: products.id, active: products.active })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(where)
      .orderBy(asc(products.name), asc(variants.sort), asc(variants.id))
      .limit(PER)
      .offset((page - 1) * PER),
    db.select({ n: count() }).from(variants).innerJoin(products, eq(variants.productId, products.id)).where(where),
  ]);
  const [shops, per] = await Promise.all([activeStores(), stockByStore(rows.map((r) => r.id))]);
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PER));
  const href = (o: { page?: number; low?: boolean }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (o.low ?? low) p.set("low", "1");
    if (o.page && o.page > 1) p.set("page", String(o.page));
    const s = p.toString();
    return `/admin/products/bulk${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title={T("المخزون والأسعار")} subtitle={T("عدّل الأسعار والمخزون لعدة منتجات دفعة واحدة، أو عبر ملف Excel.")} actions={<BulkFileTools />} />
      <div className="flex flex-wrap items-center gap-2">
        <form className="relative min-w-60 flex-1" action="/admin/products/bulk">
          {low && <input type="hidden" name="low" value="1" />}
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" defaultValue={q} placeholder={T("ابحث بالاسم أو العلامة أو SKU…")} className="input !py-2 ps-9 text-sm" aria-label={T("بحث")} />
        </form>
        <Link href={href({ low: false })} className={cn("btn btn-sm", !low ? "btn-brand" : "btn-outline")}>{T("الكل")}</Link>
        <Link href={href({ low: true })} className={cn("btn btn-sm", low ? "btn-brand" : "btn-outline")}>{T("مخزون منخفض (3 أو أقل)")}</Link>
      </div>
      <BulkEditor
        key={`${q}-${low}-${page}`}
        shops={shops.map((st) => ({ id: st.id, name: T.lang === "fr" ? st.nameFr : st.nameAr }))}
        rows={rows.map((r) => ({ ...r, variant: [r.color, r.storage].filter(Boolean).join(" · "), qty: Object.fromEntries(shops.map((st) => [st.id, per.get(r.id)?.get(st.id) ?? 0])) }))}
      />
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="btn btn-outline btn-sm" href={href({ page: page - 1 })}>{T("السابق")}</Link>}
          <span className="text-muted">{T("صفحة {page} من {pages}", { page, pages })}</span>
          {page < pages && <Link className="btn btn-outline btn-sm" href={href({ page: page + 1 })}>{T("التالي")}</Link>}
        </nav>
      )}
    </div>
  );
}
