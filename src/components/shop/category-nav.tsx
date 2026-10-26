import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Category, CategoryWithCount } from "@/db/queries";
import { CategoryIcon } from "@/components/ui/category-icon";
import type { Dict } from "@/lib/dictionary";
import { localePath, pick, type Locale } from "@/lib/i18n";
import { cn, fmt } from "@/lib/utils";

type Base = { locale: Locale; d: Dict };

/** Home › family › sub-category, for category pages. */
export function CategoryCrumbs({ locale, d, parent, category }: Base & { parent: Category | null; category: Category }) {
  const name = (c: Category) => pick(locale, c.nameFr, c.nameAr);
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-sm text-muted">
      <Link href={localePath(locale)} className="hover:text-fg">{d.product.breadcrumbHome}</Link>
      {parent && (
        <>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          <Link href={localePath(locale, `/c/${parent.slug}`)} className="hover:text-fg">{name(parent)}</Link>
        </>
      )}
      <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
      <span className="font-medium text-fg">{name(category)}</span>
    </nav>
  );
}

/** The sub-categories of a family page, as large tappable tiles. */
export function SubCategoryTiles({ locale, d, items }: Base & { items: CategoryWithCount[] }) {
  return (
    <section className="mb-6 sm:mb-8" aria-label={d.shop.subcategories}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href={localePath(locale, `/c/${c.slug}`)}
              className="group flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition active:scale-[0.97] hover:border-brand hover:shadow-card sm:p-4"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand">
                <CategoryIcon name={c.icon} className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight sm:text-base">{pick(locale, c.nameFr, c.nameAr)}</span>
                <span className="mt-0.5 block text-xs text-muted">{fmt(c.count === 1 ? d.shop.resultsOne : d.shop.results, { n: c.count })}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** On a sub-category page: jump to a sibling, or back to the whole family. */
export function SiblingChips({ locale, d, parent, siblings, currentId }: Base & { parent: Category; siblings: CategoryWithCount[]; currentId: number }) {
  const chip = "inline-flex min-h-11 shrink-0 items-center rounded-full border px-5 text-sm font-semibold transition";
  return (
    <nav className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0" aria-label={pick(locale, parent.nameFr, parent.nameAr)}>
      <Link href={localePath(locale, `/c/${parent.slug}`)} className={cn(chip, "border-line text-fg-2 hover:border-fg")}>
        {d.shop.all}
      </Link>
      {siblings.map((s) => (
        <Link
          key={s.id}
          href={localePath(locale, `/c/${s.slug}`)}
          aria-current={s.id === currentId ? "page" : undefined}
          className={cn(chip, s.id === currentId ? "border-fg bg-fg text-bg" : "border-line text-fg-2 hover:border-fg")}
        >
          {pick(locale, s.nameFr, s.nameAr)}
        </Link>
      ))}
    </nav>
  );
}
