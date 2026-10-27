"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, Lock, Tag } from "lucide-react";
import { useCart, useI18n } from "@/components/providers";
import { placeOrder, validateCoupon } from "@/app/actions/shop";
import { useCartSync } from "./cart-view";
import { ProductVisual } from "@/components/ui/product-visual";
import { store } from "@/config/store";
import { localePath, pick } from "@/lib/i18n";
import { formatPrice } from "@/lib/money";
import { shippingCost } from "@/lib/pricing";
import { cn, fmt } from "@/lib/utils";

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
      <h2 className="mb-5 flex items-center gap-3 text-lg font-bold">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-xs text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Signed-in customers get their details and default address filled in. */
export type CheckoutPrefill = Partial<Record<"firstName" | "lastName" | "email" | "phone" | "address" | "address2" | "postalCode" | "city", string>>;

export function CheckoutForm({ prefill = {} }: { prefill?: CheckoutPrefill }) {
  const { locale, d } = useI18n();
  const cart = useCart();
  const router = useRouter();
  const notice = useCartSync();
  const [pending, start] = useTransition();
  const [method, setMethod] = useState<string>("standard");
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  // Keep the coupon discount in sync with the cart subtotal.
  useEffect(() => {
    if (!coupon) return;
    let alive = true;
    validateCoupon(coupon.code, cart.subtotal).then((r) => {
      if (!alive) return;
      if (r.ok) setCoupon({ code: r.code, discount: r.discount });
      else {
        setCoupon(null);
        setCouponMsg(r.reason === "min" ? d.cart.couponMin : r.reason === "rate" ? d.common.tooMany : d.cart.couponInvalid);
      }
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.subtotal]);

  useEffect(() => {
    if (error) document.getElementById("checkout-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  const discount = coupon?.discount ?? 0;
  const ship = shippingCost(method) ?? 0;
  const total = cart.subtotal - discount + ship;

  const field = useMemo(
    () => (name: string) => ({
      name,
      id: name,
      defaultValue: prefill[name as keyof CheckoutPrefill],
      "aria-invalid": errorFields.includes(name) ? (true as const) : undefined,
      className: "input",
    }),
    [errorFields, prefill],
  );

  if (!cart.ready) return <div className="min-h-[40vh]" aria-busy="true" />;
  if (cart.lines.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-semibold">{d.checkout.emptyCart}</p>
        <Link href={localePath(locale, "/shop")} className="btn btn-primary mt-6">
          {d.common.continueShopping}
        </Link>
      </div>
    );
  }

  function applyCoupon() {
    if (!couponInput.trim()) return;
    start(async () => {
      const r = await validateCoupon(couponInput, cart.subtotal);
      if (r.ok) {
        setCoupon({ code: r.code, discount: r.discount });
        setCouponMsg(null);
      } else {
        setCoupon(null);
        setCouponMsg(r.reason === "min" ? d.cart.couponMin : r.reason === "rate" ? d.common.tooMany : d.cart.couponInvalid);
      }
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setErrorFields([]);
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    start(async () => {
      const res = await placeOrder({
        locale,
        firstName: get("firstName"),
        lastName: get("lastName"),
        email: get("email"),
        phone: get("phone"),
        address: get("address"),
        address2: get("address2"),
        city: get("city"),
        postalCode: get("postalCode"),
        country: get("country"),
        shippingMethod: method,
        couponCode: coupon?.code,
        note: get("note"),
        website: get("website"),
        items: cart.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
      });
      if (res.ok) {
        cart.clear();
        router.push(`${localePath(locale, `/order/${res.number}`)}?t=${res.token}`);
        return;
      }
      if (res.error === "invalid") {
        setErrorFields(res.fields ?? []);
        setError(d.checkout.invalid);
        document.getElementById(res.fields?.[0] ?? "")?.focus();
      } else if (res.error === "stock") {
        setError(res.name ? fmt(d.checkout.outOfStock, { name: res.name }) : d.cart.removedUnavailable);
      } else if (res.error === "rate") {
        setError(d.common.tooMany);
      } else if (res.error === "coupon") {
        setCoupon(null);
        setCouponMsg(d.cart.couponInvalid);
        setError(d.cart.couponInvalid);
      } else {
        setError(d.common.error);
      }
    });
  }

  return (
    <form id="checkout-form" onSubmit={onSubmit} className="grid gap-6 pb-28 lg:grid-cols-[1fr_26rem] lg:gap-8 lg:pb-0">
      <div className="space-y-5">
        {notice && <p className="rounded-2xl bg-[#fff7e6] px-4 py-3 text-sm font-medium text-[#8a5300]">{d.cart.stockChanged}</p>}

        <Section n={1} title={d.checkout.contact}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="firstName">{d.checkout.firstName}</label>
              <input {...field("firstName")} required autoComplete="given-name" maxLength={60} />
            </div>
            <div>
              <label className="label" htmlFor="lastName">{d.checkout.lastName}</label>
              <input {...field("lastName")} required autoComplete="family-name" maxLength={60} />
            </div>
            <div>
              <label className="label" htmlFor="email">{d.checkout.email}</label>
              <input {...field("email")} type="email" required autoComplete="email" dir="ltr" maxLength={120} />
            </div>
            <div>
              <label className="label" htmlFor="phone">{d.checkout.phone}</label>
              <input {...field("phone")} type="tel" required autoComplete="tel" dir="ltr" inputMode="tel" maxLength={20} />
              <p className="mt-1.5 text-xs text-muted">{d.checkout.phoneHint}</p>
            </div>
          </div>
        </Section>

        <Section n={2} title={d.checkout.delivery}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address">{d.checkout.address}</label>
              <input {...field("address")} required autoComplete="address-line1" maxLength={160} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="address2">{d.checkout.address2} <span className="font-normal text-muted">({d.common.optional})</span></label>
              <input {...field("address2")} autoComplete="address-line2" maxLength={160} />
            </div>
            <div>
              <label className="label" htmlFor="postalCode">{d.checkout.postalCode} <span className="font-normal text-muted">({d.common.optional})</span></label>
              <input {...field("postalCode")} autoComplete="postal-code" dir="ltr" inputMode="numeric" maxLength={12} />
            </div>
            <div>
              <label className="label" htmlFor="city">{d.checkout.city}</label>
              <input {...field("city")} required autoComplete="address-level2" maxLength={80} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="country">{d.checkout.country}</label>
              <select {...field("country")} defaultValue={store.countries[0].code} autoComplete="country">
                {store.countries.map((c) => (
                  <option key={c.code} value={c.code}>{pick(locale, c.fr, c.ar)}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="note">{d.checkout.note} <span className="font-normal text-muted">({d.common.optional})</span></label>
              <textarea {...field("note")} rows={2} maxLength={500} placeholder={d.checkout.noteOptional} />
            </div>
          </div>
          {/* Honeypot — real users never see or fill this */}
          <div className="absolute -start-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
            <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
        </Section>

        <Section n={3} title={d.checkout.shippingMethod}>
          <ul className="space-y-3" role="radiogroup">
            {store.shippingMethods.map((m) => {
              const cost = shippingCost(m.id) ?? 0;
              const active = method === m.id;
              return (
                <li key={m.id}>
                  <label className={cn("flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition", active ? "border-fg bg-mist/60" : "border-line hover:border-fg/40")}>
                    <input type="radio" name="shippingMethod" value={m.id} checked={active} onChange={() => setMethod(m.id)} className="h-4.5 w-4.5 accent-ink" />
                    <span className="flex-1">
                      <span className="block font-semibold">{m.id === "express" ? d.checkout.express : d.checkout.standard}</span>
                      <span className="block text-sm text-muted">{fmt(d.checkout.days, { min: m.minDays, max: m.maxDays })}</span>
                    </span>
                    <span className="font-bold tabular-nums" dir="ltr">{cost === 0 ? d.common.free : formatPrice(cost, locale)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </Section>

        <Section n={4} title={d.checkout.payment}>
          <div className="flex items-start gap-4 rounded-2xl border-2 border-fg bg-mist/60 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-white">
              <Banknote className="h-5.5 w-5.5" aria-hidden="true" />
            </span>
            <div className="flex-1">
              <p className="flex items-center gap-2 font-semibold">
                {d.checkout.cod}
                <Check className="h-4 w-4 text-ok" aria-hidden="true" />
              </p>
              <p className="mt-1 text-sm text-muted">{fmt(d.checkout.codText, { amount: formatPrice(total, locale) })}</p>
            </div>
          </div>
        </Section>
      </div>

      {/* Summary */}
      <aside className="h-fit space-y-5 rounded-3xl border border-line bg-surface p-5 sm:p-7 lg:sticky lg:top-36">
        <h2 className="text-lg font-bold">{d.checkout.summary}</h2>
        <ul className="max-h-72 divide-y divide-line overflow-y-auto">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="flex items-center gap-3 py-3">
              <div className="relative h-16 w-16 shrink-0 rounded-xl bg-mist p-1">
                <ProductVisual image={l.image} art={l.art} color={l.colorHex} alt={l.name} />
                <span className="absolute -end-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[0.65rem] font-bold text-white">{l.qty}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-semibold">{l.name}</p>
                <p className="text-xs text-muted">{pick(locale, l.variantLabel.fr, l.variantLabel.ar)}</p>
              </div>
              <span className="text-sm font-semibold tabular-nums" dir="ltr">{formatPrice(l.price * l.qty, locale)}</span>
            </li>
          ))}
        </ul>

        <div>
          <label className="label" htmlFor="coupon">{d.cart.couponLabel}</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="coupon"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCoupon();
                  }
                }}
                placeholder={d.cart.couponPlaceholder}
                className="input !ps-9 uppercase"
                dir="ltr"
                autoComplete="off"
              />
            </div>
            <button type="button" onClick={applyCoupon} disabled={pending} className="btn btn-outline">
              {d.cart.couponApply}
            </button>
          </div>
          {coupon && <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-ok"><Check className="h-4 w-4" aria-hidden="true" />{fmt(d.cart.couponApplied, { code: coupon.code })}</p>}
          {couponMsg && !coupon && <p className="mt-2 text-sm font-medium text-hot">{couponMsg}</p>}
        </div>

        <dl className="space-y-2.5 border-t border-line pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{d.common.subtotal}</dt>
            <dd className="font-semibold tabular-nums" dir="ltr">{formatPrice(cart.subtotal, locale)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-ok">
              <dt>{d.common.discount}</dt>
              <dd className="font-semibold tabular-nums" dir="ltr">−{formatPrice(discount, locale)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">{d.common.shipping}</dt>
            <dd className="font-semibold tabular-nums" dir="ltr">{ship === 0 ? d.common.free : formatPrice(ship, locale)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-line pt-4 text-lg font-extrabold">
            <dt>{d.common.total}</dt>
            <dd className="tabular-nums" dir="ltr">{formatPrice(total, locale)}</dd>
          </div>
        </dl>

        {error && <p id="checkout-error" role="alert" className="rounded-2xl bg-hot-50 px-4 py-3 text-sm font-medium text-hot">{error}</p>}

        <button type="submit" disabled={pending} className="btn btn-brand btn-lg hidden w-full lg:flex">
          <Lock className="h-4.5 w-4.5" aria-hidden="true" />
          {pending ? d.checkout.placing : d.checkout.place}
        </button>
        <p className="text-center text-xs text-muted">{d.checkout.terms}</p>
      </aside>

      {/* Phones: total + confirm always within thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted">{d.common.total}</p>
            <p className="text-lg font-extrabold tabular-nums" dir="ltr" style={{ textAlign: locale === "ar" ? "right" : "left" }}>
              {formatPrice(total, locale)}
            </p>
          </div>
          <button type="submit" form="checkout-form" disabled={pending} className="btn btn-brand btn-lg ms-auto flex-1">
            <Lock className="h-4.5 w-4.5" aria-hidden="true" />
            {pending ? d.checkout.placing : d.checkout.place}
          </button>
        </div>
      </div>
    </form>
  );
}
