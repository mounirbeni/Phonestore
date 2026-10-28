import Link from "next/link";
import { and, count, desc, eq, gte, lt, ne, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Ban, Banknote, MapPin, Package, ShoppingCart, Tags, TrendingDown, TrendingUp, UserPlus } from "lucide-react";
import { db } from "@/db";
import { categories, customers, orderItems, orders, products } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { getT } from "@/lib/admin-lang";
import { eur } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";
import { PageHeader, Panel, StatTile } from "@/components/admin/ui";

export async function generateMetadata() {
  const T = await getT();
  return { title: T("الإحصائيات") };
}

const PERIODS = [7, 30, 90, 365] as const;
type Props = { searchParams: Promise<{ p?: string }> };

/** Horizontal bar list: label, figure, and a bar sized against the largest value. */
function Bars({ rows, empty }: { rows: { label: string; value: number; text: string; sub?: string }[]; empty: string }) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{r.label}</span>
            <span className="shrink-0 tabular-nums" dir="ltr">{r.text}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-mist">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} />
          </div>
          {r.sub && <p className="mt-1 text-xs text-muted">{r.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

export default async function StatsPage({ searchParams }: Props) {
  const T = await getT();
  await requirePerm("stats");
  const p = Number((await searchParams).p);
  const days = (PERIODS as readonly number[]).includes(p) ? p : 30;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const prevStart = new Date(start.getTime() - days * 864e5);
  const live = ne(orders.status, "cancelled");
  const inPeriod = and(gte(orders.createdAt, start), live);
  // A year is shown per month, shorter periods per day.
  const unit = days > 90 ? "month" : "day";
  // Inlined (not a bound parameter) so the SELECT and GROUP BY expressions are identical.
  const trunc = sql.raw(`'${unit}'`);
  const parent = alias(categories, "parent");

  const [[cur], [prev], [cancelled], [itemsSold], [newCustomers], series, top, cities, cats] = await Promise.all([
    db.select({ revenue: sum(orders.total), n: count() }).from(orders).where(inPeriod),
    db.select({ revenue: sum(orders.total), n: count() }).from(orders).where(and(gte(orders.createdAt, prevStart), lt(orders.createdAt, start), live)),
    db.select({ n: count() }).from(orders).where(and(gte(orders.createdAt, start), eq(orders.status, "cancelled"))),
    db.select({ n: sum(orderItems.quantity) }).from(orderItems).innerJoin(orders, eq(orderItems.orderId, orders.id)).where(inPeriod),
    db.select({ n: count() }).from(customers).where(gte(customers.createdAt, start)),
    db
      .select({ at: sql<string>`to_char(date_trunc(${trunc}, ${orders.createdAt}), 'YYYY-MM-DD')`, revenue: sum(orders.total), n: count() })
      .from(orders)
      .where(inPeriod)
      .groupBy(sql`date_trunc(${trunc}, ${orders.createdAt})`),
    db
      .select({ name: orderItems.name, slug: orderItems.productSlug, qty: sql<number>`sum(${orderItems.quantity})::int`, revenue: sql<number>`sum(${orderItems.unitPrice} * ${orderItems.quantity})::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(inPeriod)
      .groupBy(orderItems.name, orderItems.productSlug)
      .orderBy(desc(sql`sum(${orderItems.unitPrice} * ${orderItems.quantity})`))
      .limit(10),
    db
      .select({ city: sql<string>`initcap(trim(${orders.city}))`, n: count(), revenue: sql<number>`sum(${orders.total})::int` })
      .from(orders)
      .where(inPeriod)
      .groupBy(sql`initcap(trim(${orders.city}))`)
      .orderBy(desc(sql`sum(${orders.total})`))
      .limit(10),
    db
      .select({
        fr: sql<string>`coalesce(${parent.nameFr}, ${categories.nameFr})`,
        ar: sql<string>`coalesce(${parent.nameAr}, ${categories.nameAr})`,
        revenue: sql<number>`sum(${orderItems.unitPrice} * ${orderItems.quantity})::int`,
        qty: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(products.slug, orderItems.productSlug))
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(parent, eq(categories.parentId, parent.id))
      .where(inPeriod)
      .groupBy(sql`coalesce(${parent.nameFr}, ${categories.nameFr})`, sql`coalesce(${parent.nameAr}, ${categories.nameAr})`)
      .orderBy(desc(sql`sum(${orderItems.unitPrice} * ${orderItems.quantity})`))
      .limit(10),
  ]);

  const revenue = Number(cur?.revenue ?? 0);
  const n = cur?.n ?? 0;
  const prevRevenue = Number(prev?.revenue ?? 0);
  const delta = prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null;
  const all = n + (cancelled?.n ?? 0);
  const cancelRate = all ? Math.round(((cancelled?.n ?? 0) / all) * 100) : 0;

  // Every day (or month) of the period, including those without sales.
  const byKey = new Map(series.map((s) => [s.at, Number(s.revenue ?? 0)]));
  const buckets: { key: string; label: string; value: number }[] = [];
  const fmtDay = new Intl.DateTimeFormat(T.lang === "ar" ? "ar-u-nu-latn" : "fr-FR", unit === "month" ? { month: "short" } : { day: "numeric", month: "short" });
  for (let d = new Date(start); d <= now; unit === "month" ? d.setMonth(d.getMonth() + 1, 1) : d.setDate(d.getDate() + 1)) {
    const key = unit === "month" ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01` : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!buckets.some((b) => b.key === key)) buckets.push({ key, label: fmtDay.format(d), value: byKey.get(key) ?? 0 });
  }
  const maxBucket = Math.max(1, ...buckets.map((b) => b.value));
  const every = Math.ceil(buckets.length / 10);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={T("الإحصائيات")}
        subtitle={T("الطلبات الملغاة غير محسوبة في المبيعات")}
        actions={
          <div className="flex rounded-xl border border-line bg-surface p-1">
            {PERIODS.map((d) => (
              <Link key={d} href={`/admin/stats?p=${d}`} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition", d === days ? "bg-brand text-white" : "text-ink-2 hover:text-fg")}>
                {d === 365 ? T("سنة") : T("{n} يومًا", { n: d })}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatTile
          label={T("المبيعات")}
          value={eur(revenue)}
          icon={Banknote}
          tone="bg-brand-50 text-brand"
          hint={delta == null ? T("لا توجد فترة سابقة للمقارنة") : (
            <span className={cn("inline-flex items-center gap-1 font-semibold", delta >= 0 ? "text-ok" : "text-hot")}>
              {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span dir="ltr">{delta >= 0 ? "+" : ""}{delta}%</span> {T("مقارنة بالفترة السابقة")}
            </span>
          )}
        />
        <StatTile label={T("الطلبات")} value={String(n)} icon={ShoppingCart} tone="bg-ok-50 text-ok" hint={T("متوسط الطلب: {amount}", { amount: eur(n ? Math.round(revenue / n) : 0) })} />
        <StatTile label={T("القطع المباعة")} value={String(Number(itemsSold?.n ?? 0))} icon={Package} tone="bg-fg/10 text-fg" hint={T("{n} عميل جديد", { n: newCustomers?.n ?? 0 })} />
        <StatTile label={T("نسبة الإلغاء")} value={`${cancelRate}%`} icon={Ban} tone="bg-warn-50 text-warn" hint={T("{n} طلب ملغى", { n: cancelled?.n ?? 0 })} />
      </div>

      <Panel title={unit === "month" ? T("المبيعات حسب الشهر") : T("المبيعات اليومية")} icon={TrendingUp}>
        {revenue === 0 ? (
          <p className="py-12 text-center text-sm text-muted">{T("لا توجد مبيعات في هذه الفترة")}</p>
        ) : (
          <div className="flex h-56 items-end gap-[3px]" dir="ltr">
            {buckets.map((b, i) => (
              <div key={b.key} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                <span className="pointer-events-none absolute -top-1 z-10 hidden -translate-y-full whitespace-nowrap rounded-md bg-fg px-2 py-1 text-[0.7rem] font-semibold text-bg group-hover:block">{b.label} · {eur(b.value)}</span>
                <div className={cn("w-full max-w-10 rounded-t-md transition", b.value ? "bg-brand/80 group-hover:bg-brand" : "bg-mist")} style={{ height: `${b.value ? Math.max(3, (b.value / maxBucket) * 100) : 2}%` }} />
                <span className={cn("mt-1.5 h-4 truncate text-[0.65rem] text-muted", i % every !== 0 && "invisible")}>{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={T("المنتجات الأكثر مبيعًا")} icon={Package}>
          <Bars
            empty={T("لا توجد مبيعات في هذه الفترة")}
            rows={top.map((r) => ({ label: r.name, value: r.revenue, text: eur(r.revenue), sub: T("{n} قطعة", { n: r.qty }) }))}
          />
        </Panel>
        <div className="space-y-6">
          <Panel title={T("المبيعات حسب الفئة")} icon={Tags}>
            <Bars empty={T("لا توجد مبيعات في هذه الفترة")} rows={cats.map((r) => ({ label: T.lang === "fr" ? r.fr : r.ar, value: r.revenue, text: eur(r.revenue) }))} />
          </Panel>
          <Panel title={T("المبيعات حسب المدينة")} icon={MapPin}>
            <Bars empty={T("لا توجد مبيعات في هذه الفترة")} rows={cities.map((r) => ({ label: r.city || "—", value: r.revenue, text: eur(r.revenue), sub: T("{n} طلب", { n: r.n }) }))} />
          </Panel>
        </div>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted"><UserPlus className="h-3.5 w-3.5" aria-hidden="true" />{T("العملاء الجدد = الحسابات المسجّلة خلال الفترة.")}</p>
    </div>
  );
}
