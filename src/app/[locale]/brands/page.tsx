import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandMark } from "@/components/ui/brand-mark";
import { getAllBrands } from "@/db/queries";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath } from "@/lib/i18n";
import { fmt } from "@/lib/utils";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return { title: getDictionary(locale).brandsPage.title, alternates: { canonical: localePath(locale, "/brands") } };
}

export default async function BrandsPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const brands = await getAllBrands();
  return (
    <div className="container-x pb-10 pt-6 sm:pt-12">
      <h1 className="text-[1.65rem] font-extrabold tracking-tight sm:text-4xl">{d.brandsPage.title}</h1>
      <p className="mb-6 mt-2 text-muted sm:mb-8">{d.brandsPage.text}</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {brands.map((b) => (
          <li key={b.brand}>
            <Link
              href={localePath(locale, `/shop?brand=${encodeURIComponent(b.brand)}`)}
              className="flex h-28 flex-col items-center justify-center gap-1 rounded-3xl border border-line bg-surface px-3 text-center transition active:scale-[0.97] hover:border-brand hover:shadow-card"
            >
              <BrandMark brand={b.brand} className="text-lg" />
              <span className="text-xs text-muted">{fmt(b.n === 1 ? d.shop.resultsOne : d.shop.results, { n: b.n })}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
