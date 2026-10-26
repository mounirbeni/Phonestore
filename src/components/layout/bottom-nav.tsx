"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Home, LayoutGrid, Menu, ShoppingBag } from "lucide-react";
import { useCart, useI18n, useUi, useWishlist } from "@/components/providers";
import { localePath } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** App-style tab bar shown below `lg`. Pages with their own sticky action bar hide it. */
export function BottomNav() {
  const { locale, d } = useI18n();
  const path = usePathname();
  const cart = useCart();
  const wish = useWishlist();
  const ui = useUi();

  const rest = path.replace(/^\/(fr|ar)/, "") || "/";
  const hideBar = /^\/(p\/|cart|checkout|order\/)/.test(rest);

  const tab = "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[0.68rem] font-medium transition active:scale-95";
  const isHome = rest === "/";
  const isShop = rest.startsWith("/shop") || rest.startsWith("/c/");
  const isWish = rest.startsWith("/wishlist");

  return (
    <>
      {/* reserves the space the fixed bars occupy so the footer is never covered */}
      <div className="h-[calc(4.25rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
      {!hideBar && (
        <nav
          aria-label={d.nav.menu}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        >
          <ul className="mx-auto flex h-[4.25rem] max-w-lg items-stretch px-1">
            <li className="flex flex-1">
              <Link href={localePath(locale)} className={cn(tab, isHome ? "text-brand" : "text-muted")} aria-current={isHome ? "page" : undefined}>
                <Home className="h-[1.4rem] w-[1.4rem]" aria-hidden="true" />
                {d.nav.home}
              </Link>
            </li>
            <li className="flex flex-1">
              <Link href={localePath(locale, "/shop")} className={cn(tab, isShop ? "text-brand" : "text-muted")} aria-current={isShop ? "page" : undefined}>
                <LayoutGrid className="h-[1.4rem] w-[1.4rem]" aria-hidden="true" />
                {d.nav.shop}
              </Link>
            </li>
            <li className="flex flex-1 justify-center">
              <Link
                href={localePath(locale, "/cart")}
                aria-label={d.nav.cart}
                className="relative -mt-5 grid h-14 w-14 place-items-center self-start rounded-full bg-brand text-white shadow-[0_10px_24px_-8px_rgb(200_16_46/0.9)] ring-4 ring-[var(--color-bg)] transition active:scale-95"
              >
                <ShoppingBag className="h-6 w-6" aria-hidden="true" />
                {cart.ready && cart.count > 0 && (
                  <span key={cart.count} className="absolute -end-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[0.68rem] font-extrabold text-ink [animation:pop_0.3s_ease-out]">
                    {cart.count > 99 ? "99+" : cart.count}
                  </span>
                )}
              </Link>
            </li>
            <li className="flex flex-1">
              <Link href={localePath(locale, "/wishlist")} className={cn(tab, isWish ? "text-brand" : "text-muted")} aria-current={isWish ? "page" : undefined}>
                <span className="relative">
                  <Heart className="h-[1.4rem] w-[1.4rem]" aria-hidden="true" />
                  {cart.ready && wish.slugs.length > 0 && <span className="absolute -end-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-[var(--color-surface)]" />}
                </span>
                {d.nav.wishlist}
              </Link>
            </li>
            <li className="flex flex-1">
              <button type="button" onClick={() => ui.setMenuOpen(true)} className={cn(tab, "text-muted")} aria-haspopup="dialog" aria-expanded={ui.menuOpen}>
                <Menu className="h-[1.4rem] w-[1.4rem]" aria-hidden="true" />
                {d.nav.menu}
              </button>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}
