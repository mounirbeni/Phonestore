import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { dateTime, eur, statusChip, statusLabel, waLink } from "@/lib/admin-ui";
import type { Order } from "@/db/schema";
import { cn } from "@/lib/utils";
import { getT } from "@/lib/admin-lang";

export async function OrdersTable({ rows, contact = false }: { rows: Order[]; contact?: boolean }) {
  const T = await getT();
  if (!rows.length) return <p className="px-5 py-12 text-center text-sm text-muted">{T("لا توجد طلبات")}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted">
          <tr className="border-b border-line bg-mist/60 text-start">
            <th className="px-5 py-3 text-start font-medium">{T("الطلب")}</th>
            <th className="px-3 py-3 text-start font-medium">{T("العميل")}</th>
            <th className="hidden px-3 py-3 text-start font-medium sm:table-cell">{T("التاريخ")}</th>
            <th className="px-3 py-3 text-start font-medium">{T("الحالة")}</th>
            <th className="px-3 py-3 text-start font-medium">{T("الإجمالي")}</th>
            {contact && <th className="relative px-5 py-3 text-end font-medium"><span className="sr-only">{T("تواصل")}</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((o) => (
            <tr key={o.id} className="transition hover:bg-mist/50">
              <td className="px-5 py-3 font-semibold"><Link href={`/admin/orders/${o.id}`} className="text-brand hover:underline" dir="ltr">{o.number}</Link></td>
              <td className="px-3 py-3">
                <span className="block font-medium">{o.firstName} {o.lastName}</span>
                <span className="block text-xs text-muted">{o.city}</span>
              </td>
              <td className="hidden px-3 py-3 text-muted sm:table-cell">{dateTime(o.createdAt, T.lang)}</td>
              <td className="px-3 py-3"><span className={cn("chip", statusChip[o.status])}>{o.status === "pending" && o.deposit > 0 && !o.depositPaidAt ? T("بانتظار التسبيق") : T(statusLabel[o.status])}</span></td>
              <td className="px-3 py-3 font-semibold tabular-nums" dir="ltr" style={{ textAlign: T.lang === "ar" ? "right" : "left" }}>{eur(o.total)}</td>
              {contact && (
                <td className="px-5 py-3">
                  <span className="flex justify-end gap-1">
                    <a href={`tel:${o.phone}`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-2 hover:bg-mist hover:text-fg" aria-label={T("اتصال")} title={T("اتصال")}><Phone className="h-4 w-4" /></a>
                    <a href={waLink(o.phone)} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-ink-2 hover:bg-mist hover:text-ok" aria-label="WhatsApp" title="WhatsApp"><MessageCircle className="h-4 w-4" /></a>
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
