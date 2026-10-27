import { and, desc, eq, inArray } from "drizzle-orm";
import { MapPin, MessageCircle, Phone, StickyNote } from "lucide-react";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { dateTime, eur, statusChip, statusLabel } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";
import { DeliveryActions } from "@/components/admin/delivery-actions";

export const metadata = { title: "توصيلاتي" };

const wa = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "").replace(/^0/, "212")}`;

export default async function DeliveriesPage() {
  const me = await requirePerm("deliveries");
  const [open, done] = await Promise.all([
    db.select().from(orders).where(and(eq(orders.driverId, me.id!), inArray(orders.status, ["confirmed", "shipped"]))).orderBy(orders.createdAt),
    db.select().from(orders).where(and(eq(orders.driverId, me.id!), inArray(orders.status, ["delivered", "cancelled"]))).orderBy(desc(orders.createdAt)).limit(15),
  ]);
  const items = open.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, open.map((o) => o.id))) : [];
  const toCollect = open.reduce((n, o) => n + o.total, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">توصيلاتي</h1>
        <p className="mt-1 text-sm text-muted">مرحبًا {me.name} — {open.length} طلب للتوصيل، المبلغ الإجمالي للتحصيل <b className="text-ink" dir="ltr">{eur(toCollect)}</b></p>
      </div>

      {open.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-sm text-muted">لا توجد طلبات مسندة إليك حاليًا</p>
      ) : (
        <ul className="space-y-4">
          {open.map((o) => (
            <li key={o.id} className="rounded-2xl border border-line bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold" dir="ltr">{o.number}</span>
                <span className={cn("chip", statusChip[o.status])}>{statusLabel[o.status]}</span>
                <span className="ms-auto text-lg font-extrabold tabular-nums" dir="ltr">{eur(o.total)}</span>
              </div>
              <p className="mt-0.5 text-end text-xs text-muted">يُحصَّل نقدًا عند التسليم</p>
              <p className="mt-3 font-semibold">{o.firstName} {o.lastName}</p>
              <p className="mt-1 flex items-start gap-2 text-sm text-ink-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />{o.address}{o.address2 ? `، ${o.address2}` : ""} — {o.city} {o.postalCode}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`tel:${o.phone}`} className="btn btn-outline btn-sm"><Phone className="h-4 w-4" /><span dir="ltr">{o.phone}</span></a>
                <a href={wa(o.phone)} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><MessageCircle className="h-4 w-4" />واتساب</a>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address} ${o.city}`)}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><MapPin className="h-4 w-4" />الخريطة</a>
              </div>
              <ul className="mt-3 space-y-1 rounded-xl bg-mist p-3 text-sm">
                {items.filter((i) => i.orderId === o.id).map((i) => (
                  <li key={i.id} className="flex justify-between gap-3"><span className="min-w-0 truncate">{i.name}{i.variantLabel ? ` · ${i.variantLabel}` : ""}</span><span className="shrink-0">× {i.quantity}</span></li>
                ))}
              </ul>
              {o.customerNote && <p className="mt-2 flex items-start gap-2 rounded-xl bg-[#fff7e6] p-3 text-sm text-[#8a5300]"><StickyNote className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{o.customerNote}</p>}
              <DeliveryActions orderId={o.id} />
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-3 font-bold">آخر الطلبات المنتهية</h2>
          <ul className="divide-y divide-line text-sm">
            {done.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5">
                <span className="font-semibold" dir="ltr">{o.number}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{o.firstName} {o.lastName} · {o.city}</span>
                <span className={cn("chip", statusChip[o.status])}>{statusLabel[o.status]}</span>
                <span className="hidden text-xs text-muted sm:inline">{dateTime(o.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
