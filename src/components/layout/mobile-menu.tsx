"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, House, PackageSearch, Percent, Sparkles, Tags, User, X } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { LocaleSwitch } from "./header-actions";
import { useI18n, useUi } from "@/components/providers";
import { localePath, pick } from "@/lib/i18n";
import { Logo } from "./logo";

type Cat = { slug: string; nameFr: string; nameAr: string; icon: string };

/** Full menu sheet, opened from the "Menu" tab. */
export function MobileMenu({ categories }: { categories: Cat[] }) {
  const { locale, d } = useI18n();
  const { menuOpen: open, setMenuOpen } = useUi();
  const close = () => setMenuOpen(false);
  const navRef = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
  // Show a fade only while entries remain below the fold.
  const measure = useCallback(() => {
    const n = navRef.current;
    if (n) setMore(n.scrollHeight - n.scrollTop - n.clientHeight > 4);
  }, []);
  useEffect(() => {
    if (open) requestAnimationFrame(measure);
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setMenuOpen]);

  if (!open) return null;

  const row = "flex min-h-10 items-center gap-3.5 rounded-2xl px-3.5 text-[0.93rem] font-medium active:bg-mist hover:bg-mist";
  const tile = "grid h-8 w-8 place-items-center rounded-lg";

  return (
    <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label={d.nav.menu}>
      <button type="button" className="absolute inset-0 bg-black/70 [animation:fade-in_0.2s]" onClick={close} aria-label={d.common.close} />
      <aside className="absolute inset-x-0 bottom-0 flex max-h-[96dvh] flex-col rounded-t-[1.75rem] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop [animation:sheet-up_0.3s_ease-out]">
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-center justify-between px-5 pb-1 pt-2.5">
          <Logo locale={locale} />
          <button type="button" className="btn btn-ghost !h-11 !w-11 !p-0" onClick={close} aria-label={d.common.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col">
        <nav ref={navRef} onScroll={measure} className="flex-1 overflow-y-auto overscroll-contain px-3 pb-2">
          <Link href={localePath(locale)} onClick={close} className={row}>
            <span className={`${tile} bg-mist text-fg-2`}>
              <House className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
            </span>
            {d.nav.home}
          </Link>
          <Link href={localePath(locale, "/shop?deals=1")} onClick={close} className={`${row} text-hot`}>
            <span className={`${tile} bg-hot-50`}>
              <Percent className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
            </span>
            {d.nav.deals}
          </Link>
          <Link href={localePath(locale, "/shop?new=1&sort=new")} onClick={close} className={row}>
            <span className={`${tile} bg-mist text-fg-2`}>
              <Sparkles className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
            </span>
            {d.nav.newArrivals}
          </Link>
          <p className="px-3.5 pb-0.5 pt-2 text-[0.7rem] font-semibold uppercase tracking-wider text-muted">{d.nav.categories}</p>
          {categories.map((c) => (
            <Link key={c.slug} href={localePath(locale, `/c/${c.slug}`)} onClick={close} className={row}>
              <span className={`${tile} bg-brand-50 text-brand`}>
                <CategoryIcon name={c.icon} className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
              </span>
              <span className="flex-1">{pick(locale, c.nameFr, c.nameAr)}</span>
              <ChevronRight className="h-4.5 w-4.5 text-muted rtl:rotate-180" aria-hidden="true" />
            </Link>
          ))}
          <Link href={localePath(locale, "/brands")} onClick={close} className={row}>
            <span className={`${tile} bg-brand-50 text-brand`}>
              <Tags className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
            </span>
            <span className="flex-1">{d.nav.brands}</span>
            <ChevronRight className="h-4.5 w-4.5 text-muted rtl:rotate-180" aria-hidden="true" />
          </Link>
          <Link href={localePath(locale, "/track")} onClick={close} className={row}>
            <span className={`${tile} bg-mist text-fg-2`}>
              <PackageSearch className="h-[1.05rem] w-[1.05rem]" aria-hidden="true" />
            </span>
            {d.nav.track}
          </Link>
        </nav>
        {more && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent" aria-hidden="true" />}
        </div>
        <div className="flex items-center justify-between border-t border-line px-5 py-2">
          <Link href={localePath(locale, "/account")} onClick={close} className="flex min-h-11 items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.14em]">
            <User className="h-5 w-5" aria-hidden="true" />
            {d.nav.account}
          </Link>
          <LocaleSwitch />
        </div>
      </aside>
    </div>
  );
}
