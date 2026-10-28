import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Check, CheckCircle2, Landmark, Package, Truck, XCircle } from "lucide-react";
import { db } from "@/db";
import { categories, orderEvents, orderItems, orders, products } from "@/db/schema";
import { getCustomerId } from "@/lib/customer-auth";
import { store } from "@/config/store";
import { artKind } from "@/lib/art";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath, pick } from "@/lib/i18n";
import { formatPrice } from "@/lib/money";
import { cn, fmt } from "@/lib/utils";
import { ProductVisual } from "@/components/ui/product-visual";
import { PayByCard } from "@/components/shop/pay-by-card";
import { payzoneReady } from "@/lib/payments/payzone";

type Props = { params: Promise<{ locale: string; number: string }>; searchParams: Promise<{ t?: string; pay?: string }> };

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: Props) {
  const { locale, number } = await params;
  const { t, pay } = await searchParams;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  // The private link (token) works for anyone who has it; the account owner needs no token.
  const customerId = await getCustomerId();
  const [found] = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
  const order = found && ((t && found.token === t) || (customerId != null && found.customerId === customerId)) ? found : undefined;
  if (!order) {
    return (
      <div className="container-x grid min-h-[50vh] place-items-center py-20 text-center">
        <div>
          <XCircle className="mx-auto h-12 w-12 text-muted" aria-hidden="true" />
          <p className="mt-4 font-semibold">{d.order.notFound}</p>
          <Link href={localePath(locale, "/track")} className="btn btn-primary mt-6">{d.nav.track}</Link>
        </div>
      </div>
    );
  }
  const [items, events] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(orderItems.id),
    db.select({ status: orderEvents.status, at: orderEvents.createdAt }).from(orderEvents).where(and(eq(orderEvents.orderId, order.id), eq(orderEvents.kind, "status"))).orderBy(asc(orderEvents.createdAt)),
  ]);
  // When each step was reached (first time), shown under the progress steps.
  const reached = new Map<string, Date>();
  for (const e of events) if (e.status && !reached.has(e.status)) reached.set(e.status, e.at);
  if (!reached.has("pending")) reached.set("pending", order.createdAt);
  const stepDate = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "fr-FR", { day: "numeric", month: "short" });
  const icons = items.length
    ? await db
        .select({ slug: products.slug, icon: categories.icon })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .where(inArray(products.slug, items.map((i) => i.productSlug)))
    : [];
  const iconBySlug = new Map(icons.map((r) => [r.slug, r.icon]));
  const country = store.countries.find((c) => c.code === order.country);
  const steps = [
    { key: "pending", label: d.order.timelinePending, icon: Package },
    { key: "confirmed", label: d.order.timelineConfirmed, icon: Check },
    { key: "shipped", label: d.order.timelineShipped, icon: Truck },
    { key: "delivered", label: d.order.timelineDelivered, icon: CheckCircle2 },
  ] as const;
  const stepIndex = order.status === "cancelled" ? -1 : steps.findIndex((s) => s.key === order.status);
  const date = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "fr-FR", { dateStyle: "long" }).format(order.createdAt);
  const awaitingDeposit = order.deposit > 0 && !order.depositPaidAt && order.status === "pending";
  const bank = store.deposit;
  const depositAmount = formatPrice(order.deposit, locale);
  const card = awaitingDeposit && payzoneReady();

  return (
    <div className="container-x pb-10 pt-8 sm:pt-12">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] bg-ink p-8 text-center text-white ring-1 ring-white/10 sm:p-12">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-white">
            <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">{d.order.thanks}</h1>
          <p className="mx-auto mt-3 max-w-md text-white/70">{d.order.thanksText}</p>
          <p className="mt-6 text-lg font-bold" dir="ltr">{fmt(d.order.number, { number: order.number })}</p>
          <p className="text-sm text-white/60">{fmt(d.order.placedOn, { date })}</p>
        </div>

        {awaitingDeposit && (
          <section className="mt-6 rounded-3xl border-2 border-brand bg-surface p-6 sm:p-8">
            <h2 className="flex items-center gap-3 text-lg font-bold">
              <Landmark className="h-6 w-6 shrink-0 text-brand" aria-hidden="true" />
              {fmt(d.order.depositTitle, { amount: depositAmount })}
            </h2>
            {pay === "ok" && <p role="status" className="mt-3 rounded-2xl bg-ok-50 px-4 py-3 text-sm font-medium text-ok">{d.order.payOk}</p>}
            {pay === "fail" && <p role="alert" className="mt-3 rounded-2xl bg-hot-50 px-4 py-3 text-sm font-medium text-hot">{d.order.payFail}</p>}
            {card && (
              <div className="mt-5">
                <PayByCard number={order.number} token={order.token} label={fmt(d.order.payCard, { amount: depositAmount })} busy={d.order.payCardBusy} error={d.order.payCardError} />
                <p className="mt-5 text-sm font-semibold">{d.order.orTransfer}</p>
              </div>
            )}
            <p className="mt-3 text-sm leading-relaxed text-fg-2">{fmt(d.order.depositText, { amount: depositAmount, number: order.number })}</p>
            {bank.rib ? (
              <dl className="mt-5 grid gap-3 rounded-2xl bg-mist p-4 text-sm sm:grid-cols-2">
                {bank.holder && <div><dt className="text-muted">{d.order.holder}</dt><dd className="font-semibold">{bank.holder}</dd></div>}
                {bank.bank && <div><dt className="text-muted">{d.order.bank}</dt><dd className="font-semibold">{bank.bank}</dd></div>}
                <div className="sm:col-span-2"><dt className="text-muted">{d.order.rib}</dt><dd className="select-all break-all font-mono text-base font-bold tracking-wide" dir="ltr">{bank.rib}</dd></div>
                <div><dt className="text-muted">{d.order.reference}</dt><dd className="select-all font-bold" dir="ltr">{order.number}</dd></div>
                <div><dt className="text-muted">E-mail</dt><dd className="font-semibold" dir="ltr"><a href={`mailto:${store.contact.email}?subject=${encodeURIComponent(order.number)}`} className="hover:underline">{store.contact.email}</a></dd></div>
              </dl>
            ) : (
              <p className="mt-4 rounded-2xl bg-mist p-4 text-sm">{d.order.depositNoBank}</p>
            )}
            <p className="mt-4 text-xs text-muted">{d.order.depositPolicy}</p>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="mb-6 flex items-center gap-3 text-lg font-bold">
            {d.order.status}
            <span className={cn("chip", order.status === "cancelled" ? "bg-hot-50 text-hot" : "bg-brand-50 text-brand")}>{awaitingDeposit ? d.order.awaitingDeposit : d.order.statuses[order.status]}</span>
          </h2>
          {order.status !== "cancelled" && (
            <ol className="grid grid-cols-4 gap-2">
              {steps.map((s, i) => {
                const done = i <= stepIndex;
                return (
                  <li key={s.key} className="flex flex-col items-center gap-2 text-center">
                    <span className={cn("grid h-11 w-11 place-items-center rounded-full transition", done ? "bg-ink text-white" : "bg-mist text-muted")}>
                      <s.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className={cn("text-xs font-medium sm:text-sm", done ? "text-fg" : "text-muted")}>{s.label}</span>
                    {done && reached.get(s.key) && <span className="text-[0.7rem] text-muted">{stepDate.format(reached.get(s.key)!)}</span>}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="mb-2 text-lg font-bold">{d.order.items}</h2>
          <ul className="divide-y divide-line">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-4 py-4">
                <div className="h-16 w-16 shrink-0 rounded-2xl bg-mist p-1.5">
                  <ProductVisual image={i.image} art={artKind(i.name, iconBySlug.get(i.productSlug) ?? "")} color={i.colorHex} alt={i.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={localePath(locale, `/p/${i.productSlug}`)} className="line-clamp-2 text-sm font-semibold hover:underline">{i.name}</Link>
                  <p className="text-xs text-muted">{i.variantLabel} · ×{i.quantity}</p>
                </div>
                <span className="font-semibold tabular-nums" dir="ltr">{formatPrice(i.unitPrice * i.quantity, locale)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-2 border-t border-line pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{d.common.subtotal}</dt><dd className="tabular-nums" dir="ltr">{formatPrice(order.subtotal, locale)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-ok"><dt>{d.common.discount}{order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd className="tabular-nums" dir="ltr">−{formatPrice(order.discount, locale)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">{d.common.shipping}</dt><dd className="tabular-nums" dir="ltr">{order.shippingCost === 0 ? d.common.free : formatPrice(order.shippingCost, locale)}</dd></div>
            <div className="flex items-baseline justify-between border-t border-line pt-4 text-lg font-extrabold"><dt>{d.order.toPay}</dt><dd className="tabular-nums" dir="ltr">{formatPrice(order.total, locale)}</dd></div>
            {order.deposit > 0 && (
              <>
                <div className="flex justify-between"><dt className="text-muted">{d.order.deposit}</dt><dd className="tabular-nums" dir="ltr">{depositAmount}</dd></div>
                <div className="flex justify-between font-semibold"><dt>{d.order.rest}</dt><dd className="tabular-nums" dir="ltr">{formatPrice(order.total - order.deposit, locale)}</dd></div>
              </>
            )}
          </dl>
        </section>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <section className="rounded-3xl border border-line bg-surface p-6">
            <h2 className="mb-3 text-base font-bold">{d.order.shippingTo}</h2>
            <address className="text-sm not-italic leading-relaxed text-fg-2">
              {order.firstName} {order.lastName}<br />
              {order.address}{order.address2 ? `, ${order.address2}` : ""}<br />
              {order.postalCode} {order.city}<br />
              {country ? pick(locale, country.fr, country.ar) : order.country}<br />
              <span dir="ltr">{order.phone}</span>
            </address>
          </section>
          <section className="rounded-3xl border border-line bg-surface p-6">
            <h2 className="mb-3 text-base font-bold">{d.order.paymentMethod}</h2>
            <p className="flex items-center gap-2.5 text-sm text-fg-2"><Landmark className="h-5 w-5 text-brand" aria-hidden="true" />{order.deposit > 0 ? d.order.codShort : d.order.rest}</p>
            {order.depositPaidAt && <p className="mt-2 text-sm font-medium text-ok">{fmt(d.order.depositPaid, { date: stepDate.format(order.depositPaidAt) })}</p>}
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link href={localePath(locale, "/shop")} className="btn btn-primary btn-lg">{d.common.continueShopping}</Link>
        </div>
      </div>
    </div>
  );
}
