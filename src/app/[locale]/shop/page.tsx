import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath } from "@/lib/i18n";
import { ShopView, type RawParams } from "@/components/shop/shop-view";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<RawParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale);
  const sp = await searchParams;
  const title = sp.deals === "1" ? d.shop.dealsTitle : sp.new === "1" ? d.shop.newTitle : d.shop.title;
  return { title, alternates: { canonical: localePath(locale, "/shop") }, robots: Object.keys(sp).length ? { index: false, follow: true } : undefined };
}

export default async function ShopPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const sp = await searchParams;
  const title = sp.deals === "1" ? d.shop.dealsTitle : sp.new === "1" ? d.shop.newTitle : d.shop.allProducts;
  return <ShopView locale={locale} d={d} basePath={localePath(locale, "/shop")} title={title} searchParams={sp} />;
}
