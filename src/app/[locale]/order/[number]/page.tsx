import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { Banknote, Check, CheckCircle2, Package, Truck, XCircle } from "lucide-react";
import { db } from "@/db";
import { categories, orderItems, orders, products } from "@/db/schema";
import { store } from "@/config/store";
import { artKind } from "@/lib/art";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath, pick } from "@/lib/i18n";
import { formatPrice } from "@/lib/money";
import { cn, fmt } from "@/lib/utils";
import { ProductVisual } from "@/components/ui/product-visual";

type Props = { params: Promise<{ locale: string; number: string }>; searchParams: Promise<{ t?: string }> };

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function OrderPage({ params, searchParams }: Props) {
  const { locale, number } = await params;
  const { t } = await searchParams;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const [order] = t ? await db.select().from(orders).where(and(eq(orders.number, number), eq(orders.token, t))).limit(1) : [];
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
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(orderItems.id);
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

  return (
    <div className="container-x pb-10 pt-8 sm:pt-12">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] bg-ink p-8 text-center text-white sm:p-12">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-white">
            <Check className="h-8 w-8" strokeWidth={3} aria-hidden="true" />
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">{d.order.thanks}</h1>
          <p className="mx-auto mt-3 max-w-md text-white/70">{d.order.thanksText}</p>
          <p className="mt-6 text-lg font-bold" dir="ltr">{fmt(d.order.number, { number: order.number })}</p>
          <p className="text-sm text-white/60">{fmt(d.order.placedOn, { date })}</p>
        </div>

        <section className="mt-6 rounded-3xl border border-line bg-white p-6 sm:p-8">
          <h2 className="mb-6 flex items-center gap-3 text-lg font-bold">
            {d.order.status}
            <span className={cn("chip", order.status === "cancelled" ? "bg-hot-50 text-hot" : "bg-brand-50 text-brand")}>{d.order.statuses[order.status]}</span>
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
                    <span className={cn("text-xs font-medium sm:text-sm", done ? "text-ink" : "text-muted")}>{s.label}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="mt-6 rounded-3xl border border-line bg-white p-6 sm:p-8">
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
          </dl>
        </section>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <section className="rounded-3xl border border-line bg-white p-6">
            <h2 className="mb-3 text-base font-bold">{d.order.shippingTo}</h2>
            <address className="text-sm not-italic leading-relaxed text-ink-2">
              {order.firstName} {order.lastName}<br />
              {order.address}{order.address2 ? `, ${order.address2}` : ""}<br />
              {order.postalCode} {order.city}<br />
              {country ? pick(locale, country.fr, country.ar) : order.country}<br />
              <span dir="ltr">{order.phone}</span>
            </address>
          </section>
          <section className="rounded-3xl border border-line bg-white p-6">
            <h2 className="mb-3 text-base font-bold">{d.order.paymentMethod}</h2>
            <p className="flex items-center gap-2.5 text-sm text-ink-2"><Banknote className="h-5 w-5 text-brand" aria-hidden="true" />{d.order.codShort}</p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <Link href={localePath(locale, "/shop")} className="btn btn-primary btn-lg">{d.common.continueShopping}</Link>
        </div>
      </div>
    </div>
  );
}
