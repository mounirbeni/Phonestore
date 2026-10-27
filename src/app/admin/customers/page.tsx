import Link from "next/link";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { Search } from "lucide-react";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { can, requirePerm } from "@/lib/auth";
import { dateTime, eur } from "@/lib/admin-ui";

export const metadata = { title: "العملاء" };

type Props = { searchParams: Promise<{ q?: string }> };

export default async function CustomersPage({ searchParams }: Props) {
  const me = await requirePerm("customers");
  const q = (await searchParams).q?.trim().slice(0, 80) ?? "";
  const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const rows = await db
    .select({
      c: customers,
      n: sql<number>`count(${orders.id})::int`,
      spent: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} <> 'cancelled'), 0)::int`,
      last: sql<Date | null>`max(${orders.createdAt})`,
    })
    .from(customers)
    .leftJoin(orders, eq(orders.customerId, customers.id))
    .where(q ? or(ilike(customers.email, like), ilike(customers.firstName, like), ilike(customers.lastName, like), ilike(customers.phone, like)) : undefined)
    .groupBy(customers.id)
    .orderBy(desc(customers.createdAt))
    .limit(200);
  const money = can(me.role, "stats");

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">العملاء</h1>
          <p className="mt-1 text-sm text-muted">أصحاب الحسابات في المتجر ({rows.length})</p>
        </div>
        <form className="relative w-full max-w-xs" action="/admin/customers">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" defaultValue={q} placeholder="اسم، بريد أو هاتف" className="input !py-2 ps-9" />
        </form>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-sm text-muted">{q ? "لا نتائج" : "لا يوجد عملاء مسجّلون بعد"}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="border-b border-line text-start text-xs text-muted">
              <tr>
                <th className="p-3 text-start font-medium">العميل</th>
                <th className="p-3 text-start font-medium">الهاتف</th>
                <th className="p-3 text-start font-medium">الطلبات</th>
                {money && <th className="p-3 text-start font-medium">المشتريات</th>}
                <th className="p-3 text-start font-medium">آخر طلب</th>
                <th className="p-3 text-start font-medium">التسجيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ c, n, spent, last }) => (
                <tr key={c.id}>
                  <td className="p-3">
                    <p className="font-semibold">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-muted" dir="ltr" style={{ textAlign: "right" }}>{c.email}</p>
                  </td>
                  <td className="p-3" dir="ltr" style={{ textAlign: "right" }}>{c.phone ? <a className="hover:underline" href={`tel:${c.phone}`}>{c.phone}</a> : "—"}</td>
                  <td className="p-3">{n > 0 ? <Link className="font-semibold text-brand hover:underline" href={`/admin/orders?q=${encodeURIComponent(c.email)}`}>{n}</Link> : 0}</td>
                  {money && <td className="p-3 tabular-nums" dir="ltr" style={{ textAlign: "right" }}>{eur(spent)}</td>}
                  <td className="p-3 text-muted">{last ? dateTime(new Date(last)) : "—"}</td>
                  <td className="p-3 text-muted">{dateTime(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
