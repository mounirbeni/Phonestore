import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CategoryNode } from "@/db/queries";
import type { Dict } from "@/lib/dictionary";
import { localePath, pick, type Locale } from "@/lib/i18n";
import { cn, fmt } from "@/lib/utils";
import { CategoryIcon } from "@/components/ui/category-icon";

/** Families that have a cover in /public/categories (the products sit on the right of each scene). */
const COVERS = new Set([
  "telephones", "accessoires-mobiles", "informatique", "tablettes", "montres-bracelets", "audio",
  "mobilite-electrique", "tv-video", "electromenagers", "cameras",
]);

/** The two families shown as large tiles; the large ones sit at positions 1 and 6 so a 4-column grid fills evenly. */
const LARGE = ["telephones", "mobilite-electrique"];

function arrange(categories: CategoryNode[]) {
  const large = LARGE.map((s) => categories.find((c) => c.slug === s)).filter((c): c is CategoryNode => !!c);
  const rest = categories.filter((c) => !LARGE.includes(c.slug));
  if (large.length < 2) return large.concat(rest).map((c) => ({ c, big: large.includes(c) }));
  return [
    { c: large[0], big: true },
    ...rest.slice(0, 4).map((c) => ({ c, big: false })),
    { c: large[1], big: true },
    ...rest.slice(4).map((c) => ({ c, big: false })),
  ];
}

export function CategoryShowcase({ categories, locale, d }: { categories: CategoryNode[]; locale: Locale; d: Dict }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {arrange(categories).map(({ c, big }, i) => {
        const name = pick(locale, c.nameFr, c.nameAr);
        const count = fmt(c.count === 1 ? d.shop.resultsOne : d.shop.results, { n: c.count });
        const cover = COVERS.has(c.slug);
        return (
          <li key={c.id} className={cn(big ? "col-span-2 lg:row-span-2" : "col-span-1")}>
            <Link
              href={localePath(locale, `/c/${c.slug}`)}
              className={cn(
                "group relative isolate flex h-full flex-col justify-end overflow-hidden rounded-3xl border border-line bg-ink transition duration-300 hover:border-brand hover:shadow-card active:scale-[0.99]",
                big ? "aspect-[4/3] lg:aspect-auto" : "aspect-square",
              )}
            >
              {cover ? (
                <Image
                  src={`/categories/${c.slug}.webp`}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes={big ? "(min-width: 1024px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                  className="-z-10 object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                  style={{ objectPosition: big ? "70% 50%" : "82% 55%" }}
                />
              ) : (
                <span
                  className="absolute inset-0 -z-10 grid place-items-center bg-[radial-gradient(circle_at_70%_40%,rgba(220,20,40,0.55),transparent_60%)]"
                  aria-hidden="true"
                >
                  <CategoryIcon name={c.icon} className="h-16 w-16 text-white/85 transition duration-500 group-hover:scale-110 sm:h-20 sm:w-20" />
                </span>
              )}
              {/* Legibility veil: dark at the bottom where the text sits, clear over the products. */}
              <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/35 to-transparent" aria-hidden="true" />
              <div className={cn("p-3.5 sm:p-5", big && "sm:p-7")}>
                <h3 className={cn("font-extrabold leading-tight tracking-tight text-white", big ? "text-2xl sm:text-3xl" : "text-[0.95rem] sm:text-lg")}>
                  {name}
                </h3>
                <p className="mt-1 text-xs text-white/65 sm:text-sm">{count}</p>
                {big && c.children.length > 0 && (
                  <p className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
                    {c.children.slice(0, 3).map((s) => (
                      <span key={s.id} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs text-white/85 backdrop-blur-sm">
                        {pick(locale, s.nameFr, s.nameAr)}
                      </span>
                    ))}
                  </p>
                )}
                {big && (
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition group-hover:gap-2.5">
                    {d.common.viewAll}
                    <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
                  </span>
                )}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
