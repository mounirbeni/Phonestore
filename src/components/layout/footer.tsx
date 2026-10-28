import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck, Truck, Banknote, RotateCcw } from "lucide-react";
import { store } from "@/config/store";
import type { Dict } from "@/lib/dictionary";
import { localePath, pick, type Locale } from "@/lib/i18n";
import { Logo } from "./logo";
import { NewsletterForm } from "./newsletter-form";

type Cat = { slug: string; nameFr: string; nameAr: string };

export function Footer({ locale, d, categories }: { locale: Locale; d: Dict; categories: Cat[] }) {
  const link = "block py-2.5 text-[0.95rem] text-white/70 transition hover:text-white sm:text-sm";
  const perks = [
    { icon: Banknote, t: d.home.why[0].title },
    { icon: ShieldCheck, t: d.home.why[1].title },
    { icon: Truck, t: d.home.why[2].title },
    { icon: RotateCcw, t: d.home.why[3].title },
  ];
  return (
    <footer className="mt-14 border-t border-white/10 bg-ink text-white sm:mt-24">
      <div className="border-b border-white/10">
        <ul className="container-x grid grid-cols-2 gap-3 py-5 sm:gap-4 sm:py-6 lg:grid-cols-4">
          {perks.map(({ icon: Icon, t }) => (
            <li key={t} className="flex items-center gap-2.5 text-[0.8rem] font-medium leading-tight sm:gap-3 sm:text-sm">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 sm:h-10 sm:w-10">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="container-x grid grid-cols-2 gap-x-6 gap-y-9 py-10 sm:py-14 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-10">
        <div className="col-span-2 lg:col-span-1">
          <Logo locale={locale} size="lg" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">{d.footer.about}</p>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold">{d.footer.shop}</h3>
          <ul>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={localePath(locale, `/c/${c.slug}`)} className={link}>
                  {pick(locale, c.nameFr, c.nameAr)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold">{d.footer.help}</h3>
          <ul>
            {[
              ["track", d.nav.track],
              ["info/shipping", d.footer.shipping],
              ["info/returns", d.footer.returns],
              ["info/faq", d.footer.faq],
              ["info/contact", d.footer.contact],
              ["info/about", d.footer.aboutUs],
              ["info/privacy", d.footer.privacy],
              ["info/terms", d.footer.terms],
              ["info/usage", d.footer.usage],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={localePath(locale, `/${href}`)} className={link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-2 lg:col-span-1">
          <h3 className="mb-4 text-sm font-semibold">{d.footer.followUs}</h3>
          <ul className="space-y-3.5 text-[0.95rem] text-white/70 sm:text-sm">
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <a href={`mailto:${store.contact.email}`} className="inline-block py-1.5 hover:text-white" dir="ltr">{store.contact.email}</a>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <a href={`tel:${store.contact.phone.replace(/\s/g, "")}`} className="inline-block py-1.5 hover:text-white" dir="ltr">{store.contact.phone}</a>
            </li>
            {store.contact.addresses.map((a) => (
              <li key={a.locality} className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block font-semibold text-white/90">{pick(locale, a.city.fr, a.city.ar)}</span>
                  <span dir="ltr" className="block">{a.line}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x py-8">
          <NewsletterForm locale={locale} d={d.footer} />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {store.contact.legalName}. {d.footer.rights}
          </p>
          <p>{d.announcement.cod} · {d.announcement.warranty}</p>
        </div>
      </div>
    </footer>
  );
}
