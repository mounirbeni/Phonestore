import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { store } from "@/config/store";
import { getProductDetail, getRelated } from "@/db/queries";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath, pick } from "@/lib/i18n";
import { ProductPurchase } from "@/components/shop/product-purchase";
import { ProductGrid } from "@/components/shop/product-card";
import { Section } from "@/components/ui/section";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const data = await getProductDetail(slug);
  if (!data) return {};
  const { product } = data;
  const description = pick(locale, product.shortFr, product.shortAr);
  return {
    title: product.name,
    description,
    alternates: { canonical: localePath(locale, `/p/${slug}`), languages: { fr: `/fr/p/${slug}`, ar: `/ar/p/${slug}` } },
    openGraph: { title: product.name, description, type: "website", images: product.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const data = await getProductDetail(slug);
  if (!data) notFound();
  const { product, category, variants, art } = data;
  const d = getDictionary(locale);
  const related = await getRelated(product.id, product.categoryId);
  const description = pick(locale, product.descFr, product.descAr);
  const specs = product.specs;

  const prices = variants.map((v) => v.price);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    description: pick(locale, product.shortFr, product.shortAr),
    image: product.images,
    sku: variants[0]?.sku,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "EUR",
      lowPrice: (Math.min(...prices) / 100).toFixed(2),
      highPrice: (Math.max(...prices) / 100).toFixed(2),
      offerCount: variants.length,
      availability: variants.some((v) => v.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${store.url}/${locale}/p/${slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container-x pb-6 pt-3 lg:pb-0 lg:pt-8">
        <nav aria-label="Breadcrumb" className="mb-6 hidden flex-wrap items-center gap-1.5 text-sm text-muted lg:flex">
          <Link href={localePath(locale)} className="hover:text-fg">{d.product.breadcrumbHome}</Link>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          <Link href={localePath(locale, `/c/${category.slug}`)} className="hover:text-fg">{pick(locale, category.nameFr, category.nameAr)}</Link>
          <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          <span className="font-medium text-fg">{product.name}</span>
        </nav>

        <ProductPurchase
          slug={product.slug}
          name={product.name}
          brand={product.brand}
          images={product.images}
          art={art}
          isNew={product.isNew}
          condition={product.condition}
          warrantyMonths={product.warrantyMonths}
          variants={variants.map((v) => ({
            id: v.id, sku: v.sku, colorFr: v.colorFr, colorAr: v.colorAr, colorHex: v.colorHex,
            storage: v.storage, price: v.price, compareAtPrice: v.compareAtPrice, stock: v.stock,
          }))}
        />

        <div className="mt-10 grid gap-8 lg:mt-16 lg:grid-cols-2 lg:gap-10">
          {description && (
            <section>
              <h2 className="text-xl font-extrabold tracking-tight">{d.product.description}</h2>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-fg-2">{description}</p>
            </section>
          )}
          {specs.length > 0 && (
            <section>
              <h2 className="text-xl font-extrabold tracking-tight">{d.product.specs}</h2>
              <dl className="mt-4 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                {specs.map((s) => (
                  <div key={s.fr} className="grid grid-cols-[2fr_3fr] gap-4 px-5 py-3.5 text-sm odd:bg-mist/60">
                    <dt className="font-medium text-muted">{pick(locale, s.fr, s.ar)}</dt>
                    <dd className="font-semibold" dir="auto">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <Section title={d.product.related}>
          <ProductGrid items={related} locale={locale} d={d} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" />
        </Section>
      )}
    </>
  );
}
