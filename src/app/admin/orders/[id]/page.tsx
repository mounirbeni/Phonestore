import { requirePerm } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { ArrowRight, Mail, MapPin, Phone } from "lucide-react";
import { db } from "@/db";
import { customers, orderEvents, orderItems, orders, staff } from "@/db/schema";
import { store } from "@/config/store";
import { dateTime, eur, statusChip, statusLabel } from "@/lib/admin-ui";
import { OrderActions } from "@/components/admin/order-actions";
import { DriverAssign } from "@/components/admin/driver-assign";
import { DepositBox } from "@/components/admin/deposit-box";
import { dueOnDelivery } from "@/lib/pricing";
import { OrderTimeline } from "@/components/admin/order-timeline";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetail({ params }: Props) {
  await requirePerm("orders");
  const { id } = await params;
  const oid = parseInt(id, 10);
  if (!Number.isInteger(oid)) notFound();
  const [order] = await db.select().from(orders).where(eq(orders.id, oid)).limit(1);
  if (!order) notFound();
  const [items, events, drivers, [customer]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, oid)).orderBy(orderItems.id),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, oid)).orderBy(desc(orderEvents.createdAt), desc(orderEvents.id)),
    db.select({ id: staff.id, name: staff.name, phone: staff.phone }).from(staff).where(and(eq(staff.role, "driver"), eq(staff.active, true))).orderBy(asc(staff.name)),
    order.customerId ? db.select({ id: customers.id, createdAt: customers.createdAt }).from(customers).where(eq(customers.id, order.customerId)).limit(1) : Promise.resolve([]),
  ]);
  const country = store.countries.find((c) => c.code === order.country)?.fr ?? order.country;
  const shipLabel = order.shippingMethod === "express" ? "توصيل سريع" : "توصيل عادي";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/orders" className="btn btn-ghost btn-sm !px-2" aria-label="رجوع"><ArrowRight className="h-4.5 w-4.5" /></Link>
        <h1 className="text-2xl font-extrabold" dir="ltr">{order.number}</h1>
        <span className={cn("chip", statusChip[order.status])}>{statusLabel[order.status]}</span>
        <span className="ms-auto text-sm text-muted">{dateTime(order.createdAt)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white">
            <h2 className="p-5 pb-3 font-bold">المنتجات</h2>
            <ul className="divide-y divide-line px-5">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-3 text-sm">
                  <span className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-black/10" style={{ background: i.colorHex }} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/fr/p/${i.productSlug}`} target="_blank" className="font-semibold hover:underline">{i.name}</Link>
                    <p className="text-xs text-muted">{i.variantLabel}</p>
                  </div>
                  <span className="text-muted" dir="ltr">{eur(i.unitPrice)} × {i.quantity}</span>
                  <span className="w-24 text-end font-semibold tabular-nums" dir="ltr">{eur(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-line p-5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">المجموع الفرعي</dt><dd dir="ltr">{eur(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-ok"><dt>خصم {order.couponCode ? `(${order.couponCode})` : ""}</dt><dd dir="ltr">−{eur(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">التوصيل ({shipLabel})</dt><dd dir="ltr">{order.shippingCost === 0 ? "مجاني" : eur(order.shippingCost)}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-extrabold"><dt>المجموع</dt><dd dir="ltr">{eur(order.total)}</dd></div>
              {order.deposit > 0 && <div className="flex justify-between text-muted"><dt>تسبيق بالتحويل {order.depositPaidAt ? "(مستلم)" : "(غير مستلم)"}</dt><dd dir="ltr">−{eur(order.deposit)}</dd></div>}
              {order.deposit > 0 && <div className="flex justify-between font-bold"><dt>المبلغ المطلوب عند الاستلام</dt><dd dir="ltr">{eur(order.total - order.deposit)}</dd></div>}
            </dl>
          </section>
          <OrderActions id={order.id} status={order.status} note={order.adminNote} />
          <OrderTimeline events={events} />
        </div>

        <div className="space-y-6">
          <DepositBox orderId={order.id} deposit={order.deposit} paidAt={order.depositPaidAt?.toISOString() ?? null} method={order.depositMethod} reference={order.depositRef} due={dueOnDelivery(order)} status={order.status} />
          <DriverAssign orderId={order.id} driverId={order.driverId} drivers={drivers} />
          <section className="rounded-2xl border border-line bg-white p-5 text-sm">
            <h2 className="mb-3 font-bold">العميل</h2>
            <p className="font-semibold">{order.firstName} {order.lastName}</p>
            <p className="mt-1 text-xs text-muted">{customer ? <Link href={`/admin/customers?q=${encodeURIComponent(order.email)}`} className="text-brand hover:underline">صاحب حساب في المتجر</Link> : "طلب بدون حساب"}</p>
            <p className="mt-3 flex items-center gap-2"><Mail className="h-4 w-4 text-muted" aria-hidden="true" /><a className="hover:underline" href={`mailto:${order.email}`} dir="ltr">{order.email}</a></p>
            <p className="mt-2 flex items-center gap-2"><Phone className="h-4 w-4 text-muted" aria-hidden="true" /><a className="hover:underline" href={`tel:${order.phone}`} dir="ltr">{order.phone}</a></p>
          </section>
          <section className="rounded-2xl border border-line bg-white p-5 text-sm">
            <h2 className="mb-3 font-bold">عنوان التوصيل</h2>
            <p className="flex items-start gap-2 leading-relaxed" dir="ltr" style={{ textAlign: "right" }}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              <span>{order.address}{order.address2 ? `, ${order.address2}` : ""}<br />{order.postalCode} {order.city}<br />{country}</span>
            </p>
            {order.customerNote && (
              <div className="mt-4 rounded-xl bg-[#fff7e6] p-3 text-[#8a5300]"><p className="mb-1 text-xs font-bold">ملاحظة العميل</p>{order.customerNote}</div>
            )}
          </section>
          <section className="rounded-2xl border border-line bg-white p-5 text-sm">
            <p className="text-xs text-muted">لغة العميل: {order.locale === "ar" ? "العربية" : "الفرنسية"}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
