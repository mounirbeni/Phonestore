import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ORDER_STATUSES, orders, type OrderStatus } from "@/db/schema";
import { statusLabel } from "@/lib/admin-ui";
import { OrdersTable } from "@/components/admin/orders-table";
import { cn } from "@/lib/utils";

export const metadata = { title: "الطلبات" };
const PER = 25;

type Props = { searchParams: Promise<{ status?: string; q?: string; page?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const q = sp.q?.trim().slice(0, 60);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const conds: (SQL | undefined)[] = [status ? eq(orders.status, status) : undefined];
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(orders.number, like), ilike(orders.email, like), ilike(orders.firstName, like), ilike(orders.lastName, like), ilike(orders.phone, like)));
  }
  const where = and(...conds);

  const [rows, [total], counts] = await Promise.all([
    db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(PER).offset((page - 1) * PER),
    db.select({ n: count() }).from(orders).where(where),
    db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status),
  ]);
  const countBy = new Map(counts.map((c) => [c.status, c.n]));
  const all = counts.reduce((n, c) => n + c.n, 0);
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PER));
  const href = (o: { status?: string; page?: number }) => {
    const p = new URLSearchParams();
    if (o.status) p.set("status", o.status);
    if (q) p.set("q", q);
    if (o.page && o.page > 1) p.set("page", String(o.page));
    const s = p.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <h1 className="text-2xl font-extrabold">الطلبات</h1>
      <div className="flex flex-wrap items-center gap-2">
        {[{ key: undefined, label: "الكل", n: all }, ...ORDER_STATUSES.map((s) => ({ key: s as string | undefined, label: statusLabel[s], n: countBy.get(s) ?? 0 }))].map((t) => (
          <Link key={t.label} href={href({ status: t.key })} className={cn("btn btn-sm", status === t.key ? "btn-primary" : "btn-outline")}>
            {t.label} <span className="opacity-60">{t.n}</span>
          </Link>
        ))}
        <form className="ms-auto flex gap-2" action="/admin/orders">
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="رقم الطلب، الاسم، البريد…" className="input !w-60 !py-2 text-sm" aria-label="بحث" />
          <button className="btn btn-outline btn-sm" type="submit">بحث</button>
        </form>
      </div>
      <div className="rounded-2xl border border-line bg-white">
        <OrdersTable rows={rows} />
      </div>
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="btn btn-outline btn-sm" href={href({ status, page: page - 1 })}>السابق</Link>}
          <span className="text-muted">صفحة {page} من {pages}</span>
          {page < pages && <Link className="btn btn-outline btn-sm" href={href({ status, page: page + 1 })}>التالي</Link>}
        </nav>
      )}
    </div>
  );
}
