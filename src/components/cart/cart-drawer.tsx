"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ShoppingBag, X } from "lucide-react";
import { useCart, useI18n } from "@/components/providers";
import { CartLineItem } from "./cart-line";
import { ShippingProgress } from "./shipping-progress";
import { localePath } from "@/lib/i18n";
import { formatPrice } from "@/lib/money";
import { fmt } from "@/lib/utils";

export function CartDrawer() {
  const { locale, d } = useI18n();
  const cart = useCart();
  const open = cart.drawerOpen;
  const close = () => cart.setDrawerOpen(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cart.setDrawerOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, cart]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={d.cart.title}>
      <button type="button" className="absolute inset-0 bg-ink/50 [animation:fade-in_0.2s]" onClick={close} aria-label={d.common.close} />
      <aside className="absolute inset-y-0 end-0 flex w-[min(26rem,100vw)] flex-col bg-surface shadow-pop [--from:100%] rtl:[--from:-100%] [animation:slide-in_0.28s_ease-out]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold">
            {d.cart.title} <span className="text-sm font-medium text-muted">({cart.count})</span>
          </h2>
          <button type="button" className="btn btn-ghost !p-2" onClick={close} aria-label={d.common.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {cart.lines.length === 0 ? (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-mist">
                <ShoppingBag className="h-7 w-7 text-muted" />
              </span>
              <p className="mt-4 font-semibold">{d.cart.empty}</p>
              <p className="mt-1 text-sm text-muted">{d.cart.emptyHint}</p>
              <Link href={localePath(locale, "/shop")} onClick={close} className="btn btn-primary mt-6">
                {d.common.continueShopping}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              <div className="pt-4">
                <ShippingProgress subtotal={cart.subtotal} />
              </div>
              <ul className="divide-y divide-line">
                {cart.lines.map((l) => (
                  <CartLineItem key={l.variantId} line={l} onNavigate={close} />
                ))}
              </ul>
            </div>
            <div className="space-y-3 border-t border-line bg-surface p-5">
              <div className="flex items-center justify-between text-base font-bold">
                <span>{d.common.subtotal}</span>
                <span dir="ltr" className="tabular-nums">{formatPrice(cart.subtotal, locale)}</span>
              </div>
              <p className="text-xs text-muted">{fmt(d.cart.secure, {})}</p>
              <Link href={localePath(locale, "/checkout")} onClick={close} className="btn btn-brand btn-lg w-full">
                {d.cart.checkout}
              </Link>
              <Link href={localePath(locale, "/cart")} onClick={close} className="btn btn-outline w-full">
                {d.cart.viewCart}
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
