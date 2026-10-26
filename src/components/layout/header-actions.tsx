"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Heart, Languages, ShoppingBag, User } from "lucide-react";
import { useCart, useI18n, useWishlist } from "@/components/providers";
import { localePath, switchLocalePath, type Locale } from "@/lib/i18n";

function LocaleSwitchInner() {
  const { locale, d } = useI18n();
  const pathname = usePathname();
  const search = useSearchParams();
  const to: Locale = locale === "fr" ? "ar" : "fr";
  const qs = search.toString();
  const href = switchLocalePath(pathname, to) + (qs ? `?${qs}` : "");
  return (
    <Link
      href={href}
      hrefLang={to}
      onClick={() => {
        document.cookie = `NEXT_LOCALE=${to}; path=/; max-age=31536000; samesite=lax`;
      }}
      className="btn btn-ghost btn-sm min-h-10 gap-1.5"
      aria-label={`${d.nav.language}: ${to === "ar" ? "العربية" : "Français"}`}
    >
      <Languages className="h-4 w-4" aria-hidden="true" />
      <span>{to === "ar" ? "العربية" : "FR"}</span>
    </Link>
  );
}

export function LocaleSwitch() {
  return (
    <Suspense fallback={<span className="btn btn-ghost btn-sm w-16" />}>
      <LocaleSwitchInner />
    </Suspense>
  );
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span
      key={n}
      className="absolute -end-1 -top-1 grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full bg-brand px-1 text-[0.65rem] font-bold leading-none text-white [animation:pop_0.3s_ease-out]"
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function HeaderActions() {
  const { locale, d } = useI18n();
  const cart = useCart();
  const wish = useWishlist();
  return (
    <div className="flex items-center gap-1">
      <LocaleSwitch />
      <Link href={localePath(locale, "/account")} className="btn btn-ghost relative !p-2.5 max-lg:hidden" aria-label={d.nav.account}>
        <User className="h-5 w-5" aria-hidden="true" />
      </Link>
      <Link href={localePath(locale, "/wishlist")} className="btn btn-ghost relative !p-2.5 max-lg:hidden" aria-label={d.nav.wishlist}>
        <Heart className="h-5 w-5" aria-hidden="true" />
        {cart.ready && <Badge n={wish.slugs.length} />}
      </Link>
      <button type="button" onClick={() => cart.setDrawerOpen(true)} className="btn btn-ghost relative !p-2.5 max-lg:hidden" aria-label={d.nav.cart}>
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        {cart.ready && <Badge n={cart.count} />}
      </button>
    </div>
  );
}
