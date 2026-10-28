import Link from "next/link";
import { and, count, desc, eq, gt, gte, isNull, lte, ne, sql, sum } from "drizzle-orm";
import { AlertTriangle, Banknote, BarChart3, CalendarDays, Clock, Landmark, Plus, ShoppingCart, TrendingUp, Truck } from "lucide-react";
import { db } from "@/db";
import { orders, products, variants } from "@/db/schema";
import { eur } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";
import { OrdersTable } from "@/components/admin/orders-table";
import { PageHeader, Panel, StatTile } from "@/components/admin/ui";
import { CatalogDashboard, OrdersDashboard } from "@/components/admin/role-dashboards";
import { requirePerm } from "@/lib/auth";
import { getT } from "@/lib/admin-lang";

export default async function Dashboard() {
  const T = await getT();
  const me = await requirePerm("dashboard");
  if (me.role === "orders") return <OrdersDashboard name={me.name} />;
  if (me.role === "catalog") return <CatalogDashboard name={me.name} />;
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 864e5);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const live = ne(orders.status, "cancelled");

  const [[m30], [today], [pendingRow], daily, lowStock, recent, [awaitingRow], [unassignedRow]] = await Promise.all([
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
    db.select({ n: count() }).from(orders).where(and(eq(orders.status, "pending"), gt(orders.deposit, 0), isNull(orders.depositPaidAt))),
    db.select({ n: count() }).from(orders).where(and(eq(orders.status, "confirmed"), isNull(orders.driverId))),
  ]);

  const revenue30 = Number(m30?.revenue ?? 0);
  const orders30 = m30?.n ?? 0;
  const maxDay = Math.max(1, ...daily.map((d) => Number(d.revenue ?? 0)));

  const stats = [
    { label: T("إيرادات 30 يومًا"), value: eur(revenue30), icon: Banknote, tone: "bg-brand-50 text-brand" },
    { label: T("طلبات 30 يومًا"), value: String(orders30), icon: ShoppingCart, tone: "bg-ok-50 text-ok" },
    { label: T("متوسط قيمة الطلب"), value: eur(orders30 ? Math.round(revenue30 / orders30) : 0), icon: TrendingUp, tone: "bg-fg/10 text-fg" },
    { label: T("مبيعات اليوم"), value: eur(Number(today?.revenue ?? 0)), icon: CalendarDays, tone: "bg-warn-50 text-warn", hint: T("{n} طلب", { n: today?.n ?? 0 }) },
  ];

  const greet = new Intl.DateTimeFormat(T.lang === "ar" ? "ar-u-nu-latn" : "fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(now);
  const todo = [
    { n: awaitingRow?.n ?? 0, label: T("بانتظار التسبيق"), href: "/admin/orders?status=deposit", icon: Landmark },
    { n: pendingRow?.n ?? 0, label: T("بانتظار التأكيد"), href: "/admin/orders?status=pending", icon: Clock },
    { n: unassignedRow?.n ?? 0, label: T("بدون موصّل"), href: "/admin/orders?status=confirmed", icon: Truck },
    { n: lowStock.length, label: T("مخزون منخفض"), href: "/admin/products/bulk?low=1", icon: AlertTriangle },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={T("مرحبًا {name}", { name: T(me.name) })}
        subtitle={<span className="capitalize">{greet}</span>}
        actions={
          <>
            <Link href="/admin/stats" className="btn btn-outline btn-sm"><BarChart3 className="h-4 w-4" aria-hidden="true" />{T("الإحصائيات")}</Link>
            <Link href="/admin/products/new" className="btn btn-brand btn-sm"><Plus className="h-4 w-4" aria-hidden="true" />{T("منتج جديد")}</Link>
          </>
        }
      />

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {todo.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className={cn("flex items-center gap-3 rounded-2xl border p-3.5 transition hover:border-brand", t.n ? "border-brand/40 bg-brand/5" : "border-line bg-surface")}>
              <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", t.n ? "bg-brand text-white" : "bg-mist text-muted")}><t.icon className="h-4.5 w-4.5" aria-hidden="true" /></span>
              <span className="min-w-0">
                <span className="block text-lg font-extrabold leading-tight tabular-nums">{t.n}</span>
                <span className="block truncate text-xs text-muted">{t.label}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((s) => <StatTile key={s.label} {...s} />)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title={T("المبيعات اليومية (آخر 14 يومًا)")} icon={TrendingUp} actions={<span className="text-xs text-muted">{T("اليوم: {amount} · {n} طلب", { amount: eur(Number(today?.revenue ?? 0)), n: today?.n ?? 0 })}</span>}>
          {daily.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">{T("لا توجد مبيعات بعد")}</p>
          ) : (
            <ul className="flex h-48 items-end gap-1 sm:gap-2" dir="ltr">
              {daily.map((d) => {
                const v = Number(d.revenue ?? 0);
                return (
                  <li key={d.day} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                    <span className="pointer-events-none absolute -top-1 z-10 hidden -translate-y-full whitespace-nowrap rounded-md bg-fg px-2 py-1 text-[0.7rem] font-semibold text-bg group-hover:block">{eur(v)}</span>
                    <div className="w-full max-w-14 rounded-t-lg bg-brand/80 transition group-hover:bg-brand" style={{ height: `${Math.max(4, (v / maxDay) * 100)}%` }} />
                    <span className="text-[0.6rem] text-muted">{String(d.day).slice(-2)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title={T("مخزون منخفض")} icon={AlertTriangle} actions={<Link href="/admin/products/bulk?low=1" className="text-xs font-semibold text-brand hover:underline">{T("تعديل")}</Link>}>
          {lowStock.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">{T("المخزون كافٍ لجميع المنتجات")}</p>
          ) : (
            <ul className="-my-2 divide-y divide-line">
              {lowStock.map((r) => (
                <li key={r.sku}>
                  <Link href={`/admin/products/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-brand">
                    <span className="min-w-0 truncate">{r.name} <span className="text-xs text-muted">{[r.color, r.storage].filter(Boolean).join(" · ")}</span></span>
                    <span className={cn("chip shrink-0", r.stock === 0 ? "bg-hot-50 text-hot" : "bg-warn-50 text-warn")}>{r.stock === 0 ? T("نفد") : r.stock}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title={T("آخر الطلبات")} icon={ShoppingCart} flush actions={<Link href="/admin/orders" className="text-sm font-semibold text-brand hover:underline">{T("عرض الكل")}</Link>}>
        <OrdersTable rows={recent} contact />
      </Panel>
    </div>
  );
}
