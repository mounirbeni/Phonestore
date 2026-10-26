"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, PackageSearch, User, X } from "lucide-react";
import { LocaleSwitch } from "./header-actions";
import { useI18n, useUi } from "@/components/providers";
import { localePath } from "@/lib/i18n";
import type { MenuItem } from "@/lib/menu";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/** Side drawer opened from the "Menu" tab: top-level entries, expandable sub-lists, account. */
export function MobileMenu({ menu }: { menu: MenuItem[] }) {
  const { locale, d } = useI18n();
  const { menuOpen: open, setMenuOpen } = useUi();
  const [expanded, setExpanded] = useState<string | null>(null);
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

  const row = "flex min-h-[3.75rem] w-full items-center justify-between gap-3 border-b border-line px-1 text-start text-[1.05rem] font-medium transition active:bg-mist";

  return (
    <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label={d.nav.menu}>
      <button type="button" className="absolute inset-0 bg-black/70 [animation:fade-in_0.2s]" onClick={close} aria-label={d.common.close} />
      <aside className="absolute inset-y-0 start-0 flex w-[88vw] max-w-sm flex-col border-e border-line bg-surface pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-pop [--from:-100%] rtl:[--from:100%] [animation:slide-in_0.28s_ease-out]">
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <button type="button" className="-ms-2 grid h-11 w-11 place-items-center rounded-full active:bg-mist" onClick={close} aria-label={d.common.close}>
            <X className="h-6 w-6" />
          </button>
          <Logo locale={locale} />
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4" aria-label={d.nav.menu}>
          <ul>
            {menu.map((item) => {
              const isOpen = expanded === item.id;
              return (
                <li key={item.id}>
                  {item.children ? (
                    <>
                      <button
                        type="button"
                        className={cn(row, isOpen && "text-brand")}
                        aria-expanded={isOpen}
                        aria-controls={`sub-${item.id}`}
                        onClick={() => setExpanded(isOpen ? null : item.id)}
                      >
                        {item.label}
                        <ChevronRight className={cn("h-5 w-5 shrink-0 text-muted transition-transform rtl:rotate-180", isOpen && "rotate-90 text-brand rtl:rotate-90")} aria-hidden="true" />
                      </button>
                      {isOpen && (
                        <ul id={`sub-${item.id}`} className="border-b border-line bg-mist/50 py-1 [animation:fade-in_0.2s]">
                          {item.children.map((c, i) => (
                            <li key={c.href + c.label}>
                              <Link
                                href={localePath(locale, c.href)}
                                onClick={close}
                                className={cn("flex min-h-12 items-center ps-5 pe-3 text-[0.98rem] active:bg-mist", i === 0 ? "font-semibold text-brand" : "text-fg-2")}
                              >
                                {c.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link href={localePath(locale, item.href)} onClick={close} className={cn(row, item.tone === "hot" && "text-hot")}>
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="space-y-1 border-t border-line px-5 py-3">
          <Link href={localePath(locale, "/account")} onClick={close} className="flex min-h-12 items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em]">
            <User className="h-5 w-5" aria-hidden="true" />
            {d.nav.account}
          </Link>
          <div className="flex items-center justify-between">
            <Link href={localePath(locale, "/track")} onClick={close} className="flex min-h-11 items-center gap-2.5 text-sm text-fg-2">
              <PackageSearch className="h-4.5 w-4.5" aria-hidden="true" />
              {d.nav.track}
            </Link>
            <LocaleSwitch />
          </div>
        </div>
      </aside>
    </div>
  );
}
