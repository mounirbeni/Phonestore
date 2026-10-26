"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCart, useI18n } from "@/components/providers";
import { refreshCart } from "@/app/actions/shop";
import { CartLineItem } from "./cart-line";
import { ShippingProgress } from "./shipping-progress";
import { localePath } from "@/lib/i18n";
import { formatPrice } from "@/lib/money";
import { fmt } from "@/lib/utils";

/** Re-prices the local cart against the database once it has hydrated. */
export function useCartSync() {
  const cart = useCart();
  const [notice, setNotice] = useState(false);
  const done = useRef(false);
  useEffect(() => {
    if (!cart.ready || done.current) return;
    done.current = true;
    if (!cart.lines.length) return;
    refreshCart(cart.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })))
      .then(({ lines, changed }) => {
        const different =
          changed ||
          lines.length !== cart.lines.length ||
          lines.some((l) => {
            const old = cart.lines.find((o) => o.variantId === l.variantId);
            return !old || old.price !== l.price || old.stock !== l.stock;
          });
        if (different) {
          cart.replace(lines);
          setNotice(true);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.ready]);
  return notice;
}

export function CartView() {
  const { locale, d } = useI18n();
  const cart = useCart();
  const notice = useCartSync();

  if (!cart.ready) return <div className="min-h-[40vh]" aria-busy="true" />;

  if (cart.lines.length === 0) {
    return (
      <div className="grid place-items-center py-24 text-center">
        <div>
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-mist">
            <ShoppingBag className="h-9 w-9 text-muted" aria-hidden="true" />
          </span>
          <h2 className="mt-6 text-xl font-bold">{d.cart.empty}</h2>
          <p className="mt-2 text-sm text-muted">{d.cart.emptyHint}</p>
          <Link href={localePath(locale, "/shop")} className="btn btn-primary btn-lg mt-8">
            {d.common.continueShopping}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div>
        {notice && <p className="mb-4 rounded-2xl bg-[#fff7e6] px-4 py-3 text-sm font-medium text-[#8a5300]">{d.cart.stockChanged}</p>}
        <ul className="divide-y divide-line rounded-3xl border border-line bg-surface px-5">
          {cart.lines.map((l) => (
            <CartLineItem key={l.variantId} line={l} />
          ))}
        </ul>
        <Link href={localePath(locale, "/shop")} className="btn btn-ghost mt-4">
          {d.common.continueShopping}
        </Link>
      </div>
      <aside className="h-fit space-y-4 rounded-3xl border border-line bg-surface p-6 lg:sticky lg:top-36">
        <h2 className="text-lg font-bold">{d.cart.summary}</h2>
        <ShippingProgress subtotal={cart.subtotal} />
        <dl className="space-y-2.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">{fmt(d.cart.items, { n: cart.count })}</dt>
            <dd className="font-semibold tabular-nums" dir="ltr">{formatPrice(cart.subtotal, locale)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
            <dt>{d.common.subtotal}</dt>
            <dd className="tabular-nums" dir="ltr">{formatPrice(cart.subtotal, locale)}</dd>
          </div>
        </dl>
        <Link href={localePath(locale, "/checkout")} className="btn btn-brand btn-lg w-full">
          {d.cart.checkout}
        </Link>
        <p className="text-center text-xs text-muted">{d.cart.secure}</p>
      </aside>
    </div>
  );
}
