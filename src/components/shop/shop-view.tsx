import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { store } from "@/config/store";
import { getCategoryTree, getFacets, searchProducts, type CategoryContext, type ShopFilters, type SortKey } from "@/db/queries";
import type { Dict } from "@/lib/dictionary";
import { localePath, pick, type Locale } from "@/lib/i18n";
import { cn, fmt } from "@/lib/utils";
import { ProductGrid } from "./product-card";
import { FilterPanel } from "./filter-panel";
import { SortSelect } from "./sort-select";
import { CategoryCrumbs, SiblingChips, SubCategoryTiles } from "./category-nav";

export type RawParams = Record<string, string | string[] | undefined>;

const SORTS: SortKey[] = ["featured", "new", "priceAsc", "priceDesc", "discount"];

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function toCents(v: string | undefined) {
  if (!v) return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
}

export function parseParams(sp: RawParams) {
  const brandRaw = sp.brand;
  const brands = (Array.isArray(brandRaw) ? brandRaw : brandRaw ? [brandRaw] : []).slice(0, 12);
  const sort = first(sp.sort) as SortKey | undefined;
  const page = Math.max(1, parseInt(first(sp.page) ?? "1", 10) || 1);
  const etat = first(sp.etat);
  return {
    condition: etat === "neuf" ? ("new" as const) : etat === "occasion" ? ("used" as const) : undefined,
    q: first(sp.q)?.trim().slice(0, 80) || undefined,
    brands,
    min: toCents(first(sp.min)),
    max: toCents(first(sp.max)),
    inStock: first(sp.stock) === "1",
    deals: first(sp.deals) === "1",
    isNew: first(sp.new) === "1",
    sort: sort && SORTS.includes(sort) ? sort : ("featured" as SortKey),
    page,
  };
}

function qs(sp: RawParams, overrides: Record<string, string | undefined>) {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k in overrides) continue;
    if (Array.isArray(v)) v.forEach((x) => out.append(k, x));
    else if (v) out.set(k, v);
  }
  for (const [k, v] of Object.entries(overrides)) if (v) out.set(k, v);
  const s = out.toString();
  return s ? `?${s}` : "";
}

type Props = {
  locale: Locale;
  d: Dict;
  basePath: string; // e.g. /fr/shop or /fr/c/smartphones
  categorySlug?: string;
  title: string;
  searchParams: RawParams;
  /** Where the category sits in the taxonomy (parent, sub-categories, siblings). */
  context?: CategoryContext;
};

export async function ShopView({ locale, d, basePath, categorySlug, title, searchParams, context }: Props) {
  const f = parseParams(searchParams);
  const filters: ShopFilters = { ...f, category: categorySlug, perPage: 12 };
  const [result, facets, categories] = await Promise.all([searchProducts(filters), getFacets(categorySlug, f.condition), getCategoryTree()]);

  const activeCount = f.brands.length + (f.min != null ? 1 : 0) + (f.max != null ? 1 : 0) + (f.inStock ? 1 : 0) + (f.deals ? 1 : 0) + (f.isNew ? 1 : 0);
  const heading = f.q ? fmt(d.shop.resultsFor, { q: f.q }) : title;
  const countLabel = result.total === 1 ? d.shop.resultsOne : fmt(d.shop.results, { n: result.total });
  const hrefFor = (page: number) => `${basePath}${qs(searchParams, { page: page > 1 ? String(page) : undefined })}`;
  const hasConditions = !!categorySlug && store.conditionCategories.includes(categorySlug);
  const tabHref = (etat?: string) => `${basePath}${qs(searchParams, { etat, page: undefined, all: hasConditions ? "1" : undefined })}`;
  const currentEtat = f.condition === "new" ? "neuf" : f.condition === "used" ? "occasion" : undefined;
  const Prev = locale === "ar" ? ChevronRight : ChevronLeft;
  const Next = locale === "ar" ? ChevronLeft : ChevronRight;

  return (
    <div className="container-x pb-10 pt-5 sm:pt-12">
      {context && <CategoryCrumbs locale={locale} d={d} parent={context.parent} category={context.category} />}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-4xl">{heading}</h1>
          <p className="mt-1 text-sm text-muted">{countLabel}</p>
        </div>
        <div className="hidden lg:block">
          <SortSelect value={f.sort} />
        </div>
      </div>

      {context && context.children.length > 0 && !f.q && <SubCategoryTiles locale={locale} d={d} items={context.children} />}
      {context?.parent && context.siblings.length > 1 && (
        <SiblingChips locale={locale} d={d} parent={context.parent} siblings={context.siblings} currentId={context.category.id} />
      )}

      {hasConditions && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0" role="tablist" aria-label={d.condition.chooseType}>
          {([[undefined, d.condition.all], ["neuf", d.condition.new], ["occasion", d.condition.used]] as const).map(([v, label]) => {
            const active = currentEtat === v;
            return (
              <Link
                key={label}
                href={tabHref(v)}
                role="tab"
                aria-selected={active}
                className={cn("inline-flex min-h-11 shrink-0 items-center rounded-full border px-5 text-sm font-semibold transition", active ? "border-fg bg-fg text-bg" : "border-line text-fg-2 hover:border-fg")}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[16.5rem_1fr] lg:gap-8">
        <aside className="grid grid-cols-2 items-start gap-3 lg:block">
          <div className="lg:hidden">
            <SortSelect value={f.sort} full />
          </div>
          <FilterPanel activeCount={activeCount}>
            <form action={basePath} method="get" className="space-y-6 rounded-3xl border border-line bg-surface p-5 max-lg:border-0 max-lg:bg-transparent max-lg:p-1">
              {f.q && <input type="hidden" name="q" value={f.q} />}
              {currentEtat && <input type="hidden" name="etat" value={currentEtat} />}
              {hasConditions && <input type="hidden" name="all" value="1" />}
              {f.sort !== "featured" && <input type="hidden" name="sort" value={f.sort} />}

              {!categorySlug && (
                <fieldset>
                  <legend className="mb-3 text-sm font-bold">{d.shop.category}</legend>
                  <ul className="space-y-1.5 text-sm">
                    {categories.map((c) => (
                      <li key={c.id}>
                        <Link href={localePath(locale, `/c/${c.slug}`)} className="block rounded-lg px-2 py-2.5 text-fg-2 hover:bg-mist hover:text-fg lg:py-1.5">
                          {pick(locale, c.nameFr, c.nameAr)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              )}

              {facets.brands.length > 0 && (
                <fieldset>
                  <legend className="mb-3 text-sm font-bold">{d.shop.brand}</legend>
                  <ul className="space-y-2 text-sm">
                    {facets.brands.map((b) => (
                      <li key={b.brand}>
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 lg:min-h-0 lg:gap-2.5">
                          <input type="checkbox" name="brand" value={b.brand} defaultChecked={f.brands.includes(b.brand)} className="h-5 w-5 rounded accent-brand lg:h-4 lg:w-4" />
                          <span className="flex-1">{b.brand}</span>
                          <span className="text-xs text-muted">{b.n}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              )}

              <fieldset>
                <legend className="mb-3 text-sm font-bold">
                  {d.shop.price} <span className="font-normal text-muted">(DH)</span>
                </legend>
                <div className="flex items-center gap-2">
                  <input
                    type="number" inputMode="decimal" name="min" min={0} step="1" dir="ltr"
                    placeholder={String(Math.floor(facets.min / 100))}
                    defaultValue={f.min != null ? f.min / 100 : ""}
                    className="input !px-3 !py-2" aria-label={d.shop.min}
                  />
                  <span className="text-muted">–</span>
                  <input
                    type="number" inputMode="decimal" name="max" min={0} step="1" dir="ltr"
                    placeholder={String(Math.ceil(facets.max / 100))}
                    defaultValue={f.max != null ? f.max / 100 : ""}
                    className="input !px-3 !py-2" aria-label={d.shop.max}
                  />
                </div>
              </fieldset>

              <div className="space-y-2.5 text-sm">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 lg:min-h-0 lg:gap-2.5">
                  <input type="checkbox" name="stock" value="1" defaultChecked={f.inStock} className="h-5 w-5 rounded accent-brand lg:h-4 lg:w-4" />
                  {d.shop.onlyInStock}
                </label>
                <label className="flex min-h-11 cursor-pointer items-center gap-3 lg:min-h-0 lg:gap-2.5">
                  <input type="checkbox" name="deals" value="1" defaultChecked={f.deals} className="h-5 w-5 rounded accent-brand lg:h-4 lg:w-4" />
                  {d.shop.onlyDeals}
                </label>
              </div>

              <div className="flex gap-2 max-lg:sticky max-lg:bottom-0 max-lg:-mx-1 max-lg:bg-surface max-lg:pb-3 max-lg:pt-3">
                <button type="submit" className="btn btn-brand flex-1">{d.shop.apply}</button>
                {(activeCount > 0 || f.q) && (
                  <Link href={basePath} className="btn btn-outline">{d.shop.reset}</Link>
                )}
              </div>
            </form>
          </FilterPanel>
        </aside>

        <div>
          {result.items.length === 0 ? (
            <div className="grid place-items-center rounded-3xl border border-dashed border-line py-20 text-center">
              <div>
                <SearchX className="mx-auto h-10 w-10 text-muted" aria-hidden="true" />
                <p className="mt-4 font-semibold">{d.shop.noResults}</p>
                <p className="mt-1 text-sm text-muted">{d.shop.noResultsHint}</p>
                <Link href={basePath} className="btn btn-primary mt-6">{d.shop.reset}</Link>
              </div>
            </div>
          ) : (
            <ProductGrid items={result.items} locale={locale} d={d} className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3" />
          )}

          {result.pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
              {result.page > 1 ? (
                <Link href={hrefFor(result.page - 1)} className="btn btn-outline btn-sm" rel="prev">
                  <Prev className="h-4 w-4" aria-hidden="true" />
                  {d.shop.previous}
                </Link>
              ) : (
                <span className="btn btn-outline btn-sm pointer-events-none opacity-40"><Prev className="h-4 w-4" aria-hidden="true" />{d.shop.previous}</span>
              )}
              <span className="text-sm text-muted">{fmt(d.shop.page, { page: result.page, pages: result.pages })}</span>
              {result.page < result.pages ? (
                <Link href={hrefFor(result.page + 1)} className="btn btn-outline btn-sm" rel="next">
                  {d.shop.next}
                  <Next className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <span className="btn btn-outline btn-sm pointer-events-none opacity-40">{d.shop.next}<Next className="h-4 w-4" aria-hidden="true" /></span>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

