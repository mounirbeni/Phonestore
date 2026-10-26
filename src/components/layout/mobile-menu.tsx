"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ChevronRight, PackageSearch, Percent, Sparkles, X } from "lucide-react";
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

  const row = "flex min-h-14 items-center gap-3.5 rounded-2xl px-3.5 text-[0.98rem] font-medium active:bg-mist hover:bg-mist";

  return (
    <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label={d.nav.menu}>
      <button type="button" className="absolute inset-0 bg-black/70 [animation:fade-in_0.2s]" onClick={close} aria-label={d.common.close} />
      <aside className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[1.75rem] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop [animation:sheet-up_0.3s_ease-out]">
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line" aria-hidden="true" />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <Logo locale={locale} />
          <button type="button" className="btn btn-ghost !h-11 !w-11 !p-0" onClick={close} aria-label={d.common.close}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
          <p className="px-3.5 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-muted">{d.nav.categories}</p>
          {categories.map((c) => (
            <Link key={c.slug} href={localePath(locale, `/c/${c.slug}`)} onClick={close} className={row}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand">
                <CategoryIcon name={c.icon} className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="flex-1">{pick(locale, c.nameFr, c.nameAr)}</span>
              <ChevronRight className="h-4.5 w-4.5 text-muted rtl:rotate-180" aria-hidden="true" />
            </Link>
          ))}
          <div className="my-3 border-t border-line" />
          <Link href={localePath(locale, "/shop?deals=1")} onClick={close} className={`${row} text-hot`}>
            <Percent className="h-5 w-5" aria-hidden="true" />
            {d.nav.deals}
          </Link>
          <Link href={localePath(locale, "/shop?new=1&sort=new")} onClick={close} className={row}>
            <Sparkles className="h-5 w-5 text-muted" aria-hidden="true" />
            {d.nav.newArrivals}
          </Link>
          <Link href={localePath(locale, "/track")} onClick={close} className={row}>
            <PackageSearch className="h-5 w-5 text-muted" aria-hidden="true" />
            {d.nav.track}
          </Link>
        </nav>
        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <span className="text-sm text-muted">{d.nav.language}</span>
          <LocaleSwitch />
        </div>
      </aside>
    </div>
  );
}
