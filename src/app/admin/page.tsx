import Link from "next/link";
import { and, count, desc, eq, gte, lte, ne, sql, sum } from "drizzle-orm";
import { AlertTriangle, Banknote, Clock, ShoppingCart, TrendingUp } from "lucide-react";
import { db } from "@/db";
import { orders, products, variants } from "@/db/schema";
import { eur } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";
import { OrdersTable } from "@/components/admin/orders-table";
import { CatalogDashboard, OrdersDashboard } from "@/components/admin/role-dashboards";
import { requirePerm } from "@/lib/auth";

export default async function Dashboard() {
  const me = await requirePerm("dashboard");
  if (me.role === "orders") return <OrdersDashboard name={me.name} />;
  if (me.role === "catalog") return <CatalogDashboard name={me.name} />;
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 864e5);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const live = ne(orders.status, "cancelled");

  const [[m30], [today], [pendingRow], daily, lowStock, recent] = await Promise.all([
    db.select({ revenue: sum(orders.total), n: count() }).from(orders).where(and(live, gte(orders.createdAt, d30))),
    db.select({ revenue: sum(orders.total), n: count() }).from(orders).where(and(live, gte(orders.createdAt, startToday))),
    db.select({ n: count() }).from(orders).where(eq(orders.status, "pending")),
    db
      .select({ day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'MM-DD')`, revenue: sum(orders.total) })
      .from(orders)
      .where(and(live, gte(orders.createdAt, new Date(now.getTime() - 13 * 864e5 - (now.getTime() - startToday.getTime())))))
      .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
      .orderBy(sql`date_trunc('day', ${orders.createdAt})`),
    db
      .select({ id: products.id, name: products.name, sku: variants.sku, storage: variants.storage, color: variants.colorFr, stock: variants.stock })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(lte(variants.stock, 5), eq(products.active, true)))
      .orderBy(variants.stock)
      .limit(8),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
  ]);

  const revenue30 = Number(m30?.revenue ?? 0);
  const orders30 = m30?.n ?? 0;
  const maxDay = Math.max(1, ...daily.map((d) => Number(d.revenue ?? 0)));

  const stats = [
    { label: "إيرادات 30 يومًا", value: eur(revenue30), icon: Banknote, tone: "bg-brand-50 text-brand" },
    { label: "طلبات 30 يومًا", value: String(orders30), icon: ShoppingCart, tone: "bg-ok-50 text-ok" },
    { label: "متوسط قيمة الطلب", value: eur(orders30 ? Math.round(revenue30 / orders30) : 0), icon: TrendingUp, tone: "bg-ink text-white" },
    { label: "بانتظار التأكيد", value: String(pendingRow?.n ?? 0), icon: Clock, tone: "bg-[#fff7e6] text-[#b26a00]" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-2xl font-extrabold">لوحة التحكم</h1>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((s) => (
          <li key={s.label} className="rounded-2xl border border-line bg-white p-4 sm:p-5">
            <span className={cn("grid h-10 w-10 place-items-center rounded-xl", s.tone)}><s.icon className="h-5 w-5" aria-hidden="true" /></span>
            <p className="mt-4 text-xl font-extrabold tabular-nums sm:text-2xl" dir="ltr" style={{ textAlign: "right" }}>{s.value}</p>
            <p className="mt-0.5 text-xs text-muted sm:text-sm">{s.label}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">المبيعات اليومية (آخر 14 يومًا)</h2>
            <span className="text-xs text-muted">اليوم: {eur(Number(today?.revenue ?? 0))} · {today?.n ?? 0} طلب</span>
          </div>
          {daily.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">لا توجد مبيعات بعد</p>
          ) : (
            <ul className="mt-6 flex h-48 items-end gap-2" dir="ltr">
              {daily.map((d) => {
                const v = Number(d.revenue ?? 0);
                return (
                  <li key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${d.day}: ${eur(v)}`}>
                    <div className="w-full max-w-14 rounded-t-lg bg-brand/85 transition hover:bg-brand" style={{ height: `${Math.max(4, (v / maxDay) * 100)}%` }} />
                    <span className="text-[0.6rem] text-muted">{d.day}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4.5 w-4.5 text-[#b26a00]" aria-hidden="true" />مخزون منخفض</h2>
          {lowStock.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">المخزون كافٍ لجميع المنتجات</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {lowStock.map((r) => (
                <li key={r.sku}>
                  <Link href={`/admin/products/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-brand">
                    <span className="min-w-0 truncate">{r.name} <span className="text-xs text-muted">{[r.color, r.storage].filter(Boolean).join(" · ")}</span></span>
                    <span className={cn("chip shrink-0", r.stock === 0 ? "bg-hot-50 text-hot" : "bg-[#fff7e6] text-[#b26a00]")}>{r.stock === 0 ? "نفد" : r.stock}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-line bg-white">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-bold">آخر الطلبات</h2>
          <Link href="/admin/orders" className="text-sm font-semibold text-brand hover:underline">عرض الكل</Link>
        </div>
        <OrdersTable rows={recent} />
      </section>
    </div>
  );
}
