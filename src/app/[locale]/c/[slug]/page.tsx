import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { store } from "@/config/store";
import { getCategoryContext, getConditionCounts, getFacets } from "@/db/queries";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath, pick } from "@/lib/i18n";
import { ShopView, type RawParams } from "@/components/shop/shop-view";
import { BrandChooser, ConditionChooser } from "@/components/shop/condition-chooser";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<RawParams> };

/** Any of these in the URL means "show the product list", not a chooser step. */
const LISTING_KEYS = ["brand", "q", "min", "max", "stock", "deals", "new", "sort", "page", "all"];

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const cat = (await getCategoryContext(slug))?.category;
  if (!cat) return {};
  const sp = await searchParams;
  return {
    title: pick(locale, cat.nameFr, cat.nameAr),
    alternates: { canonical: localePath(locale, `/c/${slug}`) },
    robots: Object.keys(sp).length ? { index: false, follow: true } : undefined,
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const context = await getCategoryContext(slug);
  if (!context) notFound();
  const cat = context.category;
  const d = getDictionary(locale);
  const sp = await searchParams;
  const basePath = localePath(locale, `/c/${slug}`);
  const name = pick(locale, cat.nameFr, cat.nameAr);

  const etatRaw = Array.isArray(sp.etat) ? sp.etat[0] : sp.etat;
  const etat = etatRaw === "neuf" || etatRaw === "occasion" ? etatRaw : undefined;

  if (store.conditionCategories.includes(slug) && !LISTING_KEYS.some((k) => sp[k] !== undefined)) {
    const counts = await getConditionCounts(slug);
    // Only worth asking when the shop really sells both kinds.
    if (counts.new > 0 && counts.used > 0) {
      if (!etat) return <ConditionChooser locale={locale} d={d} basePath={basePath} title={name} counts={counts} />;
      const { brands } = await getFacets(slug, etat === "neuf" ? "new" : "used");
      return <BrandChooser locale={locale} d={d} basePath={basePath} title={name} etat={etat} brands={brands} />;
    }
  }

  const heading = etat ? `${name} · ${etat === "neuf" ? d.condition.new : d.condition.used}` : name;
  return <ShopView locale={locale} d={d} basePath={basePath} categorySlug={slug} title={heading} searchParams={sp} context={context} />;
}
