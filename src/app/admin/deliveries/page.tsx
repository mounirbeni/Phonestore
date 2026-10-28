import { and, desc, eq, inArray } from "drizzle-orm";
import { MapPin, MessageCircle, Phone, StickyNote } from "lucide-react";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { dateTime, eur, statusChip, statusLabel } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";
import { DeliveryActions } from "@/components/admin/delivery-actions";
import { dueOnDelivery } from "@/lib/pricing";
import { getT } from "@/lib/admin-lang";

export async function generateMetadata() {
  const T = await getT();
  return { title: T("توصيلاتي") };
}

const wa = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "212")}`;

export default async function DeliveriesPage() {
  const T = await getT();
  const me = await requirePerm("deliveries");
  const [open, done] = await Promise.all([
    db.select().from(orders).where(and(eq(orders.driverId, me.id!), inArray(orders.status, ["confirmed", "shipped"]))).orderBy(orders.createdAt),
    db.select().from(orders).where(and(eq(orders.driverId, me.id!), inArray(orders.status, ["delivered", "cancelled"]))).orderBy(desc(orders.createdAt)).limit(15),
  ]);
  const items = open.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, open.map((o) => o.id))) : [];
  const toCollect = open.reduce((n, o) => n + dueOnDelivery(o), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">{T("توصيلاتي")}</h1>
        <p className="mt-1 text-sm text-muted">{T("مرحبًا {name} — {n} طلب للتوصيل، المبلغ الإجمالي للتحصيل", { name: me.name, n: open.length })} <b className="text-fg" dir="ltr">{eur(toCollect)}</b></p>
      </div>

      {open.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">{T("لا توجد طلبات مسندة إليك حاليًا")}</p>
      ) : (
        <ul className="space-y-4">
          {open.map((o) => (
            <li key={o.id} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold" dir="ltr">{o.number}</span>
                <span className={cn("chip", statusChip[o.status])}>{T(statusLabel[o.status])}</span>
                <span className="ms-auto text-lg font-extrabold tabular-nums" dir="ltr">{eur(dueOnDelivery(o))}</span>
              </div>
              <p className="mt-0.5 text-end text-xs text-muted">{T("يُحصَّل نقدًا عند التسليم")}{o.depositPaidAt && o.deposit > 0 ? ` ${T("(بعد خصم تسبيق {amount})", { amount: eur(o.deposit) })}` : ""}</p>
              <p className="mt-3 font-semibold">{o.firstName} {o.lastName}</p>
              <p className="mt-1 flex items-start gap-2 text-sm text-ink-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />{o.address}{o.address2 ? `, ${o.address2}` : ""} — {o.city} {o.postalCode}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`tel:${o.phone}`} className="btn btn-outline btn-sm"><Phone className="h-4 w-4" /><span dir="ltr">{o.phone}</span></a>
                <a href={wa(o.phone)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><MessageCircle className="h-4 w-4" />{T("واتساب")}</a>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address} ${o.city}`)}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><MapPin className="h-4 w-4" />{T("الخريطة")}</a>
              </div>
              <ul className="mt-3 space-y-1 rounded-xl bg-mist p-3 text-sm">
                {items.filter((i) => i.orderId === o.id).map((i) => (
                  <li key={i.id} className="flex justify-between gap-3"><span className="min-w-0 truncate">{i.name}{i.variantLabel ? ` · ${i.variantLabel}` : ""}</span><span className="shrink-0">× {i.quantity}</span></li>
                ))}
              </ul>
              {o.customerNote && <p className="mt-2 flex items-start gap-2 rounded-xl bg-warn-50 p-3 text-sm text-warn"><StickyNote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{o.customerNote}</p>}
              <DeliveryActions orderId={o.id} />
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-bold">{T("آخر الطلبات المنتهية")}</h2>
          <ul className="divide-y divide-line text-sm">
            {done.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5">
                <span className="font-semibold" dir="ltr">{o.number}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{o.firstName} {o.lastName} · {o.city}</span>
                <span className={cn("chip", statusChip[o.status])}>{T(statusLabel[o.status])}</span>
                <span className="hidden text-xs text-muted sm:inline">{dateTime(o.createdAt, T.lang)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
