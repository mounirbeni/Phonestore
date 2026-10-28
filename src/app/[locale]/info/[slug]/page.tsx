import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { store } from "@/config/store";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath, pick } from "@/lib/i18n";

const SLUGS = ["shipping", "returns", "privacy", "terms", "about", "contact"] as const;
type Slug = (typeof SLUGS)[number];
type Props = { params: Promise<{ locale: string; slug: string }> };

export const dynamic = "force-dynamic"; // header/footer read categories from the database

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !SLUGS.includes(slug as Slug)) return {};
  return { title: getDictionary(locale).info[slug as Slug].title, alternates: { canonical: localePath(locale, `/info/${slug}`) } };
}

export default async function InfoPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !SLUGS.includes(slug as Slug)) notFound();
  const d = getDictionary(locale);
  const page = d.info[slug as Slug];

  return (
    <div className="container-x pb-10 pt-8 sm:pt-12">
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{page.title}</h1>
        <div className="mt-8 space-y-8">
          {page.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-bold">{s.h}</h2>
              <p className="mt-2 leading-relaxed text-fg-2">{s.p}</p>
            </section>
          ))}
        </div>
        {slug === "contact" && (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            <li className="rounded-3xl border border-line bg-surface p-5">
              <Mail className="h-6 w-6 text-brand" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">{d.info.contact.email}</p>
              <a href={`mailto:${store.contact.email}`} className="mt-1 block break-all text-sm text-fg-2 hover:underline" dir="ltr">{store.contact.email}</a>
            </li>
            <li className="rounded-3xl border border-line bg-surface p-5">
              <Phone className="h-6 w-6 text-brand" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">{d.info.contact.phone}</p>
              <a href={`tel:${store.contact.phone.replace(/\s/g, "")}`} className="mt-1 block text-sm text-fg-2 hover:underline" dir="ltr">{store.contact.phone}</a>
            </li>
            {store.contact.addresses.map((a) => (
              <li key={a.locality} className="rounded-3xl border border-line bg-surface p-5">
                <MapPin className="h-6 w-6 text-brand" aria-hidden="true" />
                <p className="mt-3 text-sm font-semibold">
                  {d.info.contact.address} · {pick(locale, a.city.fr, a.city.ar)}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.line)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-sm text-fg-2 hover:underline"
                  dir="ltr"
                >
                  {a.line}
                </a>
              </li>
            ))}
          </ul>
        )}
      </article>
    </div>
  );
}
