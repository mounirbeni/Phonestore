import { requirePerm } from "@/lib/auth";
import Link from "next/link";
import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { Download, Search } from "lucide-react";
import { db } from "@/db";
import { ORDER_STATUSES, orders } from "@/db/schema";
import { statusLabel } from "@/lib/admin-ui";
import { OrdersTable } from "@/components/admin/orders-table";
import { PageHeader } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/admin-lang";
import { orderQuery, orderWhere, parseOrderFilter, type OrderView } from "@/lib/order-filters";

export async function generateMetadata() {
  const T = await getT();
  return { title: T("الطلبات") };
}
const PER = 25;

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function OrdersPage({ searchParams }: Props) {
  const T = await getT();
  await requirePerm("orders");
  const sp = await searchParams;
  const f = parseOrderFilter(sp);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const where = orderWhere(f);
  // Tab counts follow the search and dates but not the tab itself.
  const base = orderWhere(f, { ignoreView: true });

  const [rows, [total], counts, [awaiting]] = await Promise.all([
    db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(PER).offset((page - 1) * PER),
    db.select({ n: count() }).from(orders).where(where),
    db.select({ status: orders.status, n: count() }).from(orders).where(base).groupBy(orders.status),
    db.select({ n: count() }).from(orders).where(and(base, eq(orders.status, "pending"), gt(orders.deposit, 0), isNull(orders.depositPaidAt))),
  ]);
  const countBy = new Map(counts.map((c) => [c.status, c.n]));
  const all = counts.reduce((n, c) => n + c.n, 0);
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PER));
  const link = (o: { view?: OrderView; page?: number }) => `/admin/orders${orderQuery({ ...f, view: o.view }, o.page && o.page > 1 ? { page: String(o.page) } : {})}`;
  const tabs: { view?: OrderView; label: string; n: number; hot?: boolean }[] = [
    { label: T("الكل"), n: all },
    { view: "deposit", label: T("بانتظار التسبيق"), n: awaiting?.n ?? 0, hot: true },
    ...ORDER_STATUSES.map((s) => ({ view: s as OrderView, label: T(statusLabel[s]), n: countBy.get(s) ?? 0 })),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title={T("الطلبات")}
        subtitle={T("{n} طلب", { n: total?.n ?? 0 })}
        actions={
          <a href={`/api/admin/orders${orderQuery(f)}`} className="btn btn-outline btn-sm">
            <Download className="h-4 w-4" aria-hidden="true" />
            {T("تصدير Excel")}
          </a>
        }
      />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
        {tabs.map((t) => (
          <Link key={t.label} href={link({ view: t.view })} className={cn("btn btn-sm shrink-0", f.view === t.view ? "btn-brand" : "btn-outline")}>
            {t.label}
            <span className={cn("rounded-full px-1.5 text-xs tabular-nums", f.view === t.view ? "bg-white/20" : t.hot && t.n ? "bg-warn-50 text-warn" : "opacity-60")}>{t.n}</span>
          </Link>
        ))}
      </div>
      <form className="grid gap-2 rounded-2xl border border-line bg-surface p-3 sm:grid-cols-[1fr_auto_auto_auto_auto]" action="/admin/orders">
        {f.view && <input type="hidden" name="status" value={f.view} />}
        <label className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" defaultValue={f.q} placeholder={T("رقم الطلب، الاسم، البريد، المدينة…")} className="input !py-2 ps-9 text-sm" aria-label={T("بحث")} />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          {T("من")}
          <input type="date" name="from" defaultValue={f.from} className="input !py-2 text-sm" dir="ltr" />
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          {T("إلى")}
          <input type="date" name="to" defaultValue={f.to} className="input !py-2 text-sm" dir="ltr" />
        </label>
        <select name="channel" defaultValue={f.channel ?? ""} className="input !py-2 text-sm" aria-label={T("القناة")}>
          <option value="">{T("كل القنوات")}</option>
          <option value="delivery">{T("توصيل")}</option>
          <option value="pickup">{T("استلام من المتجر")}</option>
          <option value="store">{T("بيع في المتجر")}</option>
        </select>
        <button className="btn btn-primary btn-sm" type="submit">{T("بحث")}</button>
      </form>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        <OrdersTable rows={rows} contact />
      </div>
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="btn btn-outline btn-sm" href={link({ view: f.view, page: page - 1 })}>{T("السابق")}</Link>}
          <span className="text-muted">{T("صفحة {page} من {pages}", { page, pages })}</span>
          {page < pages && <Link className="btn btn-outline btn-sm" href={link({ view: f.view, page: page + 1 })}>{T("التالي")}</Link>}
        </nav>
      )}
    </div>
  );
}
