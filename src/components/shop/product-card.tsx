import Link from "next/link";
import type { CardProduct } from "@/db/queries";
import type { Dict } from "@/lib/dictionary";
import { localePath, pick, type Locale } from "@/lib/i18n";
import { discountPercent } from "@/lib/money";
import { ProductVisual } from "@/components/ui/product-visual";
import { Price } from "@/components/ui/price";
import { WishlistButton } from "./wishlist-button";

export function ProductCard({ p, locale, d, priority }: { p: CardProduct; locale: Locale; d: Dict; priority?: boolean }) {
  const pct = discountPercent(p.minPrice, p.compareAt);
  const color = p.colors[0]?.hex;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition duration-300 active:scale-[0.985] hover:-translate-y-1 hover:border-transparent hover:shadow-pop">
      <Link href={localePath(locale, `/p/${p.slug}`)} className="relative block aspect-square bg-gradient-to-b from-mist to-surface p-4 sm:p-5" aria-label={p.name}>
        <ProductVisual
          image={p.images[0]}
          art={p.art}
          color={color}
          alt={p.name}
          eager={priority}
          className="transition duration-500 group-hover:scale-105"
        />
        <div className="absolute start-3 top-3 flex flex-col items-start gap-1.5">
          {pct > 0 && <span className="chip bg-hot text-white" dir="ltr">-{pct}%</span>}
          {p.condition === "used" && <span className="chip bg-warn-50 text-warn">{d.condition.used}</span>}
          {p.isNew && <span className="chip bg-ink text-white">{d.common.new}</span>}
        </div>
        {!p.inStock && (
          <span className="absolute inset-x-3 bottom-3 rounded-xl bg-ink/80 py-1.5 text-center text-xs font-semibold text-white backdrop-blur">
            {d.common.outOfStock}
          </span>
        )}
      </Link>
      <WishlistButton slug={p.slug} className="absolute end-3 top-3 z-10" />
      <div className="flex flex-1 flex-col p-3 pt-2.5 sm:p-4 sm:pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{p.brand}</p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.4rem] text-[0.88rem] font-semibold leading-snug sm:min-h-[2.5rem] sm:text-[0.95rem]">
          <Link href={localePath(locale, `/p/${p.slug}`)} className="after:absolute after:inset-0 after:content-[''] after:rounded-3xl">
            {p.name}
          </Link>
        </h3>
        <div className="mt-2 flex items-end justify-between gap-2 sm:mt-3">
          <Price price={p.minPrice} compareAt={p.compareAt} locale={locale} />
          {p.colors.length > 1 && (
            <ul className="relative z-10 mb-1 flex -space-x-1 rtl:space-x-reverse" aria-label={d.common.color}>
              {p.colors.map((c) => (
                <li
                  key={c.hex}
                  title={pick(locale, c.fr, c.ar)}
                  className="h-4 w-4 rounded-full border-2 border-surface ring-1 ring-line"
                  style={{ background: c.hex }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}

/** Swipeable row on phones, regular grid from `sm`. */
export function ProductRail({ items, locale, d }: { items: CardProduct[]; locale: Locale; d: Dict }) {
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-ps-4 px-4 pb-3 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
      {items.map((p, i) => (
        <li key={p.id} className="w-[44vw] max-w-[13.5rem] shrink-0 snap-start sm:w-auto sm:max-w-none">
          <ProductCard p={p} locale={locale} d={d} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGrid({ items, locale, d, className }: { items: CardProduct[]; locale: Locale; d: Dict; className?: string }) {
  return (
    <ul className={className ?? "grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"}>
      {items.map((p, i) => (
        <li key={p.id}>
          <ProductCard p={p} locale={locale} d={d} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
