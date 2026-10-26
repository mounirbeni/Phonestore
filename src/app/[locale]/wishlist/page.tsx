import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/dictionary";
import { isLocale } from "@/lib/i18n";
import { WishlistView } from "@/components/shop/wishlist-view";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).wishlist.title, robots: { index: false } } : {};
}

export default async function WishlistPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  return (
    <div className="container-x pb-10 pt-8 sm:pt-12">
      <h1 className="mb-8 text-3xl font-extrabold tracking-tight sm:text-4xl">{d.wishlist.title}</h1>
      <WishlistView />
    </div>
  );
}
