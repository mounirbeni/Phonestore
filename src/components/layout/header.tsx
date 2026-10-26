import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { store } from "@/config/store";
import type { Dict } from "@/lib/dictionary";
import { localePath, type Locale } from "@/lib/i18n";
import { formatPrice } from "@/lib/money";
import { cn, fmt } from "@/lib/utils";
import type { MenuItem } from "@/lib/menu";
import { Logo } from "./logo";
import { HeaderActions } from "./header-actions";
import { MobileSearch } from "./mobile-search";

function SearchForm({ locale, d, className, id }: { locale: Locale; d: Dict; className?: string; id: string }) {
  return (
    <form action={localePath(locale, "/shop")} method="get" role="search" className={className}>
      <label htmlFor={id} className="sr-only">
        {d.common.search}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          id={id}
          name="q"
          type="search"
          placeholder={d.common.searchPlaceholder}
          autoComplete="off"
          className="w-full rounded-full border border-transparent bg-mist py-3 ps-10 pe-4 sm:py-2.5 text-base transition sm:text-sm focus:border-brand focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
      </div>
    </form>
  );
}

export function Header({ locale, d, menu }: { locale: Locale; d: Dict; menu: MenuItem[] }) {
  const main = menu.filter((m) => !["home", "deals", "new"].includes(m.id));
  const side = menu.filter((m) => ["new", "deals"].includes(m.id));
  const items = [
    fmt(d.announcement.shipping, { amount: formatPrice(store.freeShippingThreshold, locale) }),
    d.announcement.cod,
    d.announcement.warranty,
  ];
  return (
    <>
      <div className="bg-ink pt-[env(safe-area-inset-top)] text-white">
        <div className="container-x flex h-9 items-center justify-center gap-6 overflow-hidden text-xs font-medium">
          {items.map((t, i) => (
            <span key={t} className={i === 0 ? "truncate" : "hidden sm:inline"}>
              {i > 0 && <span className="me-6 hidden text-white/30 sm:inline">•</span>}
              {t}
            </span>
          ))}
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-xl">
        <div className="container-x flex h-14 items-center gap-3 sm:h-16 lg:gap-6">
          <Logo locale={locale} />
          <SearchForm id="site-search" locale={locale} d={d} className="mx-auto hidden w-full max-w-xl md:block" />
          <div className="ms-auto md:ms-0">
            <HeaderActions />
          </div>
        </div>
        <nav className="hidden border-t border-line lg:block" aria-label={d.nav.categories}>
          <ul className="container-x flex h-11 items-center gap-0 font-medium xl:gap-0.5">
            {main.map((item, idx) => (
              <li key={item.id} className="group relative">
                <Link
                  href={localePath(locale, item.href)}
                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-[0.8rem] text-fg-2 transition hover:bg-mist hover:text-fg group-focus-within:bg-mist group-focus-within:text-fg xl:px-3 xl:text-sm"
                >
                  {item.label}
                  {item.children && <ChevronDown className="hidden h-3.5 w-3.5 opacity-60 transition group-hover:rotate-180 xl:block" aria-hidden="true" />}
                </Link>
                {item.children && (
                  <div
                    className={cn(
                      "invisible absolute top-full z-50 min-w-56 translate-y-1 rounded-2xl border border-line bg-surface p-2 opacity-0 shadow-pop transition duration-150 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100",
                      idx >= main.length - 2 ? "end-0" : "start-0",
                    )}
                  >
                    <ul>
                      {item.children.map((c, i) => (
                        <li key={c.href + c.label}>
                          <Link
                            href={localePath(locale, c.href)}
                            className={cn("block rounded-xl px-3.5 py-2.5 text-sm transition hover:bg-mist", i === 0 ? "font-semibold text-brand" : "text-fg-2 hover:text-fg")}
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
            <li className="ms-auto flex items-center gap-1">
              {side.map((item) => (
                <Link
                  key={item.id}
                  href={localePath(locale, item.href)}
                  className={cn("whitespace-nowrap rounded-lg px-2 py-2 text-[0.8rem] transition xl:px-3 xl:text-sm", item.tone === "hot" ? "font-semibold text-hot hover:bg-hot-50" : "text-fg-2 hover:bg-mist hover:text-fg")}
                >
                  {item.label}
                </Link>
              ))}
            </li>
          </ul>
        </nav>
      </header>
      {/* Mobile search scrolls away with the page so the sticky app bar stays slim. */}
      <MobileSearch />
    </>
  );
}
