import Link from "next/link";
import { dateTime, eur, statusChip, statusLabel } from "@/lib/admin-ui";
import type { Order } from "@/db/schema";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/admin-lang";

export async function OrdersTable({ rows }: { rows: Order[] }) {
  const T = await getT();
  if (!rows.length) return <p className="px-5 py-12 text-center text-sm text-muted">{T("لا توجد طلبات")}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-y border-line bg-mist/60 text-start">
            <th className="px-5 py-2.5 text-start font-medium">{T("الطلب")}</th>
            <th className="px-3 py-2.5 text-start font-medium">{T("العميل")}</th>
            <th className="hidden px-3 py-2.5 text-start font-medium sm:table-cell">{T("التاريخ")}</th>
            <th className="px-3 py-2.5 text-start font-medium">{T("الحالة")}</th>
            <th className="px-5 py-2.5 text-start font-medium">{T("الإجمالي")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((o) => (
            <tr key={o.id} className="hover:bg-mist/50">
              <td className="px-5 py-3 font-semibold"><Link href={`/admin/orders/${o.id}`} className="text-brand hover:underline" dir="ltr">{o.number}</Link></td>
              <td className="px-3 py-3">{o.firstName} {o.lastName}</td>
              <td className="hidden px-3 py-3 text-muted sm:table-cell">{dateTime(o.createdAt, T.lang)}</td>
              <td className="px-3 py-3"><span className={cn("chip", statusChip[o.status])}>{o.status === "pending" && o.deposit > 0 && !o.depositPaidAt ? T("بانتظار التسبيق") : T(statusLabel[o.status])}</span></td>
              <td className="px-5 py-3 font-semibold tabular-nums" dir="ltr" style={{ textAlign: T.lang === "ar" ? "right" : "left" }}>{eur(o.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
