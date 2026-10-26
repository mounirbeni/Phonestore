"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, PackageSearch, X } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { LocaleSwitch } from "./header-actions";
import { useI18n } from "@/components/providers";
import { localePath, pick } from "@/lib/i18n";
import { Logo } from "./logo";

type Cat = { slug: string; nameFr: string; nameAr: string; icon: string };

export function MobileMenu({ categories }: { categories: Cat[] }) {
  const { locale, d } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const item = "flex items-center gap-3 rounded-xl px-3 py-3 text-[0.95rem] font-medium hover:bg-mist";

  return (
    <>
      <button type="button" className="btn btn-ghost !p-2.5 lg:hidden" onClick={() => setOpen(true)} aria-label={d.nav.menu} aria-expanded={open}>
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={d.nav.menu}>
          <button type="button" className="absolute inset-0 bg-ink/50 [animation:fade-in_0.2s]" onClick={close} aria-label={d.common.close} />
          <aside className="absolute inset-y-0 start-0 flex w-[min(22rem,88vw)] flex-col bg-white shadow-pop [--from:-100%] rtl:[--from:100%] [animation:slide-in_0.25s_ease-out]">
            <div className="flex items-center justify-between border-b border-line p-4">
              <Logo locale={locale} />
              <button type="button" className="btn btn-ghost !p-2" onClick={close} aria-label={d.common.close}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted">{d.nav.categories}</p>
              {categories.map((c) => (
                <Link key={c.slug} href={localePath(locale, `/c/${c.slug}`)} onClick={close} className={item}>
                  <CategoryIcon name={c.icon} className="h-5 w-5 text-brand" aria-hidden="true" />
                  {pick(locale, c.nameFr, c.nameAr)}
                </Link>
              ))}
              <div className="my-3 border-t border-line" />
              <Link href={localePath(locale, "/shop?deals=1")} onClick={close} className={`${item} text-hot`}>
                {d.nav.deals}
              </Link>
              <Link href={localePath(locale, "/shop?new=1&sort=new")} onClick={close} className={item}>
                {d.nav.newArrivals}
              </Link>
              <Link href={localePath(locale, "/track")} onClick={close} className={item}>
                <PackageSearch className="h-5 w-5 text-muted" aria-hidden="true" />
                {d.nav.track}
              </Link>
            </nav>
            <div className="border-t border-line p-4">
              <LocaleSwitch />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
