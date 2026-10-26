import Link from "next/link";
import { Search } from "lucide-react";
import { store } from "@/config/store";
import type { Dict } from "@/lib/dictionary";
import { localePath, pick, type Locale } from "@/lib/i18n";
import { formatPrice } from "@/lib/money";
import { fmt } from "@/lib/utils";
import { Logo } from "./logo";
import { HeaderActions } from "./header-actions";
import { MobileSearch } from "./mobile-search";

type Cat = { slug: string; nameFr: string; nameAr: string; icon: string };

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

export function Header({ locale, d, categories }: { locale: Locale; d: Dict; categories: Cat[] }) {
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
          <ul className="container-x flex h-11 items-center gap-0 overflow-x-auto whitespace-nowrap text-[0.8125rem] font-medium scrollbar-none">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={localePath(locale, `/c/${c.slug}`)} className="rounded-lg px-2 py-2 text-fg-2 transition hover:bg-mist hover:text-fg">
                  {pick(locale, c.nameFr, c.nameAr)}
                </Link>
              </li>
            ))}
            <li>
              <Link href={localePath(locale, "/brands")} className="rounded-lg px-2 py-2 text-fg-2 transition hover:bg-mist hover:text-fg">
                {d.nav.brands}
              </Link>
            </li>
            <li className="ms-auto flex items-center gap-1">
              <Link href={localePath(locale, "/shop?new=1&sort=new")} className="rounded-lg px-2 py-2 text-fg-2 transition hover:bg-mist hover:text-fg">
                {d.nav.newArrivals}
              </Link>
              <Link href={localePath(locale, "/shop?deals=1")} className="rounded-lg px-2 py-2 font-semibold text-hot transition hover:bg-hot-50">
                {d.nav.deals}
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      {/* Mobile search scrolls away with the page so the sticky app bar stays slim. */}
      <MobileSearch />
    </>
  );
}
