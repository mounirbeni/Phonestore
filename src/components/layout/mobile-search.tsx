"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useI18n } from "@/components/providers";
import { localePath } from "@/lib/i18n";

/** Search field under the app bar on phones; hidden on focused task screens. */
export function MobileSearch() {
  const { locale, d } = useI18n();
  const rest = usePathname().replace(/^\/(fr|ar)/, "") || "/";
  if (/^\/(p\/|cart|checkout|order\/)/.test(rest)) return null;
  return (
    <div className="container-x pb-1 pt-3 md:hidden">
      <form action={localePath(locale, "/shop")} method="get" role="search">
        <label htmlFor="site-search-m" className="sr-only">
          {d.common.search}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            id="site-search-m"
            name="q"
            type="search"
            enterKeyHint="search"
            placeholder={d.common.searchPlaceholder}
            autoComplete="off"
            className="w-full rounded-full border border-transparent bg-mist py-3 ps-10 pe-4 text-base transition focus:border-brand focus:bg-surface focus:outline-none focus:ring-4 focus:ring-brand/10"
          />
        </div>
      </form>
    </div>
  );
}
