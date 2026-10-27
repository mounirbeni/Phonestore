"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ShoppingBag, X } from "lucide-react";
import { useCart, useI18n } from "@/components/providers";
import { CartLineItem } from "./cart-line";
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
      <button type="button" className="absolute inset-0 bg-black/70 [animation:fade-in_0.2s]" onClick={close} aria-label={d.common.close} />
      <aside className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[1.75rem] border-t border-line bg-surface shadow-pop [animation:sheet-up_0.3s_ease-out] sm:inset-y-0 sm:start-auto sm:end-0 sm:max-h-none sm:w-[26rem] sm:rounded-none sm:border-s sm:border-t-0 sm:[--from:100%] sm:rtl:[--from:-100%] sm:[animation:slide-in_0.28s_ease-out]">
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-line px-5 py-3 sm:py-4">
          <h2 className="text-lg font-bold">
            {d.cart.title} <span className="text-sm font-medium text-muted">({cart.count})</span>
          </h2>
          <button type="button" className="btn btn-ghost !h-11 !w-11 !p-0" onClick={close} aria-label={d.common.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        {cart.lines.length === 0 ? (
          <div className="grid flex-1 place-items-center p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center">
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
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
              <ul className="divide-y divide-line pt-2">
                {cart.lines.map((l) => (
                  <CartLineItem key={l.variantId} line={l} onNavigate={close} />
                ))}
              </ul>
            </div>
            <div className="space-y-3 border-t border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
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
