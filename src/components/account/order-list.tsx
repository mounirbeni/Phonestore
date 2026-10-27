import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Dict } from "@/lib/dictionary";
import { localePath, type Locale } from "@/lib/i18n";
import { formatPrice } from "@/lib/money";
import { cn, fmt } from "@/lib/utils";

export type OrderRow = { number: string; status: keyof Dict["order"]["statuses"]; total: number; createdAt: Date; items: number };

const tone: Record<string, string> = {
  pending: "bg-warn-50 text-warn",
  confirmed: "bg-brand-50 text-brand",
  shipped: "bg-brand-50 text-brand",
  delivered: "bg-ok-50 text-ok",
  cancelled: "bg-hot-50 text-hot",
};

export function OrderList({ locale, d, rows }: { locale: Locale; d: Dict; rows: OrderRow[] }) {
  const date = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "fr-FR", { dateStyle: "medium" });
  return (
    <ul className="space-y-3">
      {rows.map((o) => (
        <li key={o.number}>
          <Link href={localePath(locale, `/order/${o.number}`)} className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4 transition active:scale-[0.99] hover:border-brand">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold" dir="ltr">{o.number}</span>
                <span className={cn("chip", tone[o.status])}>{d.order.statuses[o.status]}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{date.format(o.createdAt)} · {fmt(d.account.itemsCount, { n: o.items })}</p>
            </div>
            <span className="font-bold tabular-nums" dir="ltr">{formatPrice(o.total, locale)}</span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted rtl:rotate-180" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
