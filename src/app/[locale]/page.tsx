import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Banknote, BadgeCheck, ChevronDown, RotateCcw, Truck } from "lucide-react";
import { store } from "@/config/store";
import { getCategoryTree, getHomeData } from "@/db/queries";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath, pick } from "@/lib/i18n";
import { formatPrice } from "@/lib/money";
import { fmt } from "@/lib/utils";
import { ProductRail } from "@/components/shop/product-card";
import { Section } from "@/components/ui/section";
import { CategoryShowcase } from "@/components/shop/category-showcase";
import { BrandMark } from "@/components/ui/brand-mark";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const [{ featured, deals, fresh, brands }, categories] = await Promise.all([getHomeData(), getCategoryTree()]);
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {/* Hero */}
      <section className="container-x pt-2 sm:pt-6">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-ink text-white ring-1 ring-white/10 sm:rounded-[2.5rem]">
          {/* Photo scene on the far side (mirrored in Arabic so the products never sit under the text). */}
          <div className="relative aspect-[16/11] sm:absolute sm:inset-y-0 sm:end-0 sm:aspect-auto sm:w-[64%] lg:w-[60%]" aria-hidden="true">
            <Image
              src="/categories/telephones.webp"
              alt=""
              fill
              priority
              sizes="(min-width: 1280px) 740px, (min-width: 640px) 64vw, 100vw"
              className="object-cover object-[72%_40%] rtl:-scale-x-100 sm:object-[60%_50%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent sm:bg-gradient-to-r sm:from-ink sm:via-ink/30 sm:to-transparent sm:rtl:bg-gradient-to-l" />
          </div>
          <div className="relative -mt-14 px-5 pb-6 sm:mt-0 sm:px-12 sm:py-16 lg:px-16 lg:py-24">
            <div className="max-w-xl">
              <span className="chip bg-white/10 text-white/90 ring-1 ring-white/15 backdrop-blur">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" aria-hidden="true" />
                {d.home.kicker}
              </span>
              <h1 className="mt-4 text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:mt-5 sm:text-5xl lg:text-[3.6rem]">{d.home.title}</h1>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-white/70 sm:mt-5 sm:text-lg">{d.home.text}</p>
              <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
                <Link href={localePath(locale, "/shop")} className="btn btn-lg bg-brand px-3 text-[0.85rem] text-white shadow-[0_10px_30px_-10px_rgba(225,29,52,0.8)] hover:bg-brand/90 sm:px-6 sm:text-base">
                  {d.home.ctaPrimary}
                  <ArrowRight className="h-4.5 w-4.5 rtl:rotate-180" aria-hidden="true" />
                </Link>
                <Link href={localePath(locale, "/shop?deals=1")} className="btn btn-lg border border-white/20 bg-white/5 px-3 text-[0.85rem] text-white backdrop-blur hover:bg-white/10 sm:px-6 sm:text-base">
                  {d.home.ctaSecondary}
                </Link>
              </div>
            </div>
            <ul className="mt-6 grid gap-2.5 text-[0.82rem] text-white/80 sm:mt-12 sm:inline-flex sm:flex-wrap sm:gap-x-6 sm:rounded-2xl sm:border sm:border-white/10 sm:bg-black/40 sm:px-5 sm:py-3.5 sm:text-sm sm:backdrop-blur-md">
              <li className="flex items-center gap-2"><Banknote className="h-4.5 w-4.5 text-[#ff4d5e]" aria-hidden="true" />{d.announcement.cod}</li>
              <li className="flex items-center gap-2"><BadgeCheck className="h-4.5 w-4.5 text-[#ff4d5e]" aria-hidden="true" />{d.announcement.warranty}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Categories */}
      <Section title={d.home.shopByCategory}>
        <CategoryShowcase categories={categories} locale={locale} d={d} />
      </Section>

      <Section title={d.home.featured} href={localePath(locale, "/shop")} linkLabel={d.common.viewAll}>
        <ProductRail items={featured} locale={locale} d={d} />
      </Section>

      {/* Deals */}
      {deals.length > 0 && (
        <section className="mt-10 bg-mist py-9 sm:mt-24 sm:py-20">
          <div className="container-x">
            <div className="mb-4 flex items-end justify-between gap-4 sm:mb-8">
              <div>
                <span className="chip bg-hot text-white">{d.common.sale}</span>
                <h2 className="mt-2 text-[1.4rem] font-extrabold tracking-tight sm:mt-3 sm:text-3xl">{d.home.deals}</h2>
              </div>
              <Link href={localePath(locale, "/shop?deals=1&sort=discount")} className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                {d.common.viewAll}
                <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
            <ProductRail items={deals} locale={locale} d={d} />
          </div>
        </section>
      )}

      <Section title={d.home.newArrivals} href={localePath(locale, "/shop?sort=new")} linkLabel={d.common.viewAll}>
        <ProductRail items={fresh} locale={locale} d={d} />
      </Section>

      {/* Brands */}
      <Section title={d.home.brands}>
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto scroll-ps-4 px-4 pb-1 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-8">
          {brands.map((b) => (
            <li key={b} className="w-32 shrink-0 snap-start sm:w-auto">
              <Link
                href={localePath(locale, `/shop?brand=${encodeURIComponent(b)}`)}
                className="grid h-16 place-items-center rounded-2xl border border-line bg-surface px-2 text-base sm:h-20 sm:text-lg font-extrabold tracking-tight text-fg-2 transition hover:border-fg hover:text-fg"
              >
                <BrandMark brand={b} size="sm" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* Why us */}
      <Section title={d.home.whyTitle}>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {d.home.why.map((w, i) => {
            const Icon = why[i];
            return (
              <li key={w.title} className="rounded-3xl border border-line bg-surface p-4 sm:p-6">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand text-white sm:h-12 sm:w-12">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-[0.95rem] font-bold leading-snug sm:mt-5 sm:text-lg">{w.title}</h3>
                <p className="mt-1.5 text-[0.8rem] leading-relaxed text-muted sm:mt-2 sm:text-sm">{w.text}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* FAQ */}
      <Section title={d.home.faqTitle}>
        <div className="mx-auto max-w-3xl divide-y divide-line rounded-3xl border border-line bg-surface">
          {d.home.faq.map((f) => (
            <details key={f.q} className="group px-4 py-4 sm:px-6 sm:py-5">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-[0.95rem] font-semibold">
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
