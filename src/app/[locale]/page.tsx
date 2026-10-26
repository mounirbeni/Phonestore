import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Banknote, BadgeCheck, ChevronDown, RotateCcw, Truck } from "lucide-react";
import { store } from "@/config/store";
import { getCategories, getCategoryCounts, getHomeData } from "@/db/queries";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath, pick } from "@/lib/i18n";
import { formatPrice } from "@/lib/money";
import { fmt } from "@/lib/utils";
import { ProductGrid } from "@/components/shop/product-card";
import { Section } from "@/components/ui/section";
import { CategoryIcon } from "@/components/ui/category-icon";
import { ProductArt } from "@/components/ui/product-art";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const [{ featured, deals, fresh, brands }, categories, counts] = await Promise.all([getHomeData(), getCategories(), getCategoryCounts()]);
  const why = [Banknote, BadgeCheck, Truck, RotateCcw];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", name: store.name, url: store.url, email: store.contact.email, telephone: store.contact.phone },
      {
        "@type": "WebSite",
        name: store.name,
        url: store.url,
        potentialAction: { "@type": "SearchAction", target: `${store.url}/${locale}/shop?q={search_term_string}`, "query-input": "required name=search_term_string" },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero */}
      <section className="container-x pt-4 sm:pt-6">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-ink text-white ring-1 ring-white/10 sm:rounded-[2.5rem]">
          <div className="pointer-events-none absolute -end-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-brand/45 blur-[120px]" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-32 start-1/3 h-[24rem] w-[24rem] rounded-full bg-[#7d0a1c]/50 blur-[120px]" aria-hidden="true" />
          <div className="relative grid items-center gap-6 px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:px-16 lg:py-20">
            <div>
              <span className="chip bg-white/10 text-white/90 ring-1 ring-white/15 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
                {d.home.kicker}
              </span>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">{d.home.title}</h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">{d.home.text}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={localePath(locale, "/shop")} className="btn btn-lg bg-white text-ink hover:bg-white/90">
                  {d.home.ctaPrimary}
                  <ArrowRight className="h-4.5 w-4.5 rtl:rotate-180" aria-hidden="true" />
                </Link>
                <Link href={localePath(locale, "/shop?deals=1")} className="btn btn-lg border border-white/20 text-white hover:bg-white/10">
                  {d.home.ctaSecondary}
                </Link>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/70">
                <li className="flex items-center gap-2"><Banknote className="h-4.5 w-4.5 text-[#ff4d5e]" aria-hidden="true" />{d.announcement.cod}</li>
                <li className="flex items-center gap-2"><BadgeCheck className="h-4.5 w-4.5 text-[#ff4d5e]" aria-hidden="true" />{d.announcement.warranty}</li>
                <li className="flex items-center gap-2"><Truck className="h-4.5 w-4.5 text-[#ff4d5e]" aria-hidden="true" />{fmt(d.announcement.shipping, { amount: formatPrice(store.freeShippingThreshold, locale) })}</li>
              </ul>
            </div>
            <div className="relative mx-auto aspect-square w-full max-w-[26rem] lg:max-w-[32rem]" aria-hidden="true">
              <ProductArt kind="phone" color="#2c2c31" className="h-full w-full [animation:float_6s_ease-in-out_infinite] drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <Section title={d.home.shopByCategory}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={localePath(locale, `/c/${c.slug}`)}
                className="group flex h-full flex-col items-center gap-3 rounded-3xl border border-line bg-white p-5 text-center transition duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-card"
              >
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand transition group-hover:bg-brand group-hover:text-white">
                  <CategoryIcon name={c.icon} className="h-7 w-7" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold">{pick(locale, c.nameFr, c.nameAr)}</span>
                <span className="text-xs text-muted">{fmt(counts.get(c.id) === 1 ? d.shop.resultsOne : d.shop.results, { n: counts.get(c.id) ?? 0 })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={d.home.featured} href={localePath(locale, "/shop")} linkLabel={d.common.viewAll}>
        <ProductGrid items={featured} locale={locale} d={d} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" />
      </Section>

      {/* Deals */}
      {deals.length > 0 && (
        <section className="mt-16 bg-mist py-14 sm:mt-24 sm:py-20">
          <div className="container-x">
            <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
              <div>
                <span className="chip bg-hot text-white">{d.common.sale}</span>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{d.home.deals}</h2>
              </div>
              <Link href={localePath(locale, "/shop?deals=1&sort=discount")} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                {d.common.viewAll}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
            <ProductGrid items={deals} locale={locale} d={d} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" />
          </div>
        </section>
      )}

      <Section title={d.home.newArrivals} href={localePath(locale, "/shop?sort=new")} linkLabel={d.common.viewAll}>
        <ProductGrid items={fresh} locale={locale} d={d} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4" />
      </Section>

      {/* Brands */}
      <Section title={d.home.brands}>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {brands.map((b) => (
            <li key={b}>
              <Link
                href={localePath(locale, `/shop?brand=${encodeURIComponent(b)}`)}
                className="grid h-20 place-items-center rounded-2xl border border-line bg-white text-lg font-extrabold tracking-tight text-ink-2 transition hover:border-ink hover:text-ink"
                dir="ltr"
              >
                {b}
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* Why us */}
      <Section title={d.home.whyTitle}>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {d.home.why.map((w, i) => {
            const Icon = why[i];
            return (
              <li key={w.title} className="rounded-3xl border border-line bg-white p-6">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-white">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{w.text}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* FAQ */}
      <Section title={d.home.faqTitle}>
        <div className="mx-auto max-w-3xl divide-y divide-line rounded-3xl border border-line bg-white">
          {d.home.faq.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-semibold">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
