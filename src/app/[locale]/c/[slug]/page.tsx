import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/db/queries";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath, pick } from "@/lib/i18n";
import { ShopView, type RawParams } from "@/components/shop/shop-view";

type Props = { params: Promise<{ locale: string; slug: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const cat = await getCategoryBySlug(slug);
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
  const cat = await getCategoryBySlug(slug);
  if (!cat) notFound();
  const d = getDictionary(locale);
  return (
    <ShopView
      locale={locale}
      d={d}
      basePath={localePath(locale, `/c/${slug}`)}
      categorySlug={slug}
      title={pick(locale, cat.nameFr, cat.nameAr)}
      searchParams={await searchParams}
    />
  );
}
