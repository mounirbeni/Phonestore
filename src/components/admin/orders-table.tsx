import Link from "next/link";
import { dateTime, eur, statusChip, statusLabel } from "@/lib/admin-ui";
import type { Order } from "@/db/schema";
import { cn } from "@/lib/utils";

export function OrdersTable({ rows }: { rows: Order[] }) {
  if (!rows.length) return <p className="px-5 py-12 text-center text-sm text-muted">لا توجد طلبات</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-y border-line bg-mist/60 text-start">
            <th className="px-5 py-2.5 text-start font-medium">الطلب</th>
            <th className="px-3 py-2.5 text-start font-medium">العميل</th>
            <th className="hidden px-3 py-2.5 text-start font-medium sm:table-cell">التاريخ</th>
            <th className="px-3 py-2.5 text-start font-medium">الحالة</th>
            <th className="px-5 py-2.5 text-start font-medium">الإجمالي</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((o) => (
            <tr key={o.id} className="hover:bg-mist/50">
              <td className="px-5 py-3 font-semibold"><Link href={`/admin/orders/${o.id}`} className="text-brand hover:underline" dir="ltr">{o.number}</Link></td>
              <td className="px-3 py-3">{o.firstName} {o.lastName}</td>
              <td className="hidden px-3 py-3 text-muted sm:table-cell">{dateTime(o.createdAt)}</td>
              <td className="px-3 py-3"><span className={cn("chip", statusChip[o.status])}>{statusLabel[o.status]}</span></td>
              <td className="px-5 py-3 font-semibold tabular-nums" dir="ltr" style={{ textAlign: "right" }}>{eur(o.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
