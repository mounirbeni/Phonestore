import Link from "next/link";
import { Mail, MapPin, Phone, ShieldCheck, Truck, Banknote, RotateCcw } from "lucide-react";
import { store } from "@/config/store";
import type { Dict } from "@/lib/dictionary";
import { localePath, pick, type Locale } from "@/lib/i18n";
import { Logo } from "./logo";

type Cat = { slug: string; nameFr: string; nameAr: string };

export function Footer({ locale, d, categories }: { locale: Locale; d: Dict; categories: Cat[] }) {
  const link = "text-sm text-white/70 transition hover:text-white";
  const perks = [
    { icon: Banknote, t: d.home.why[0].title },
    { icon: ShieldCheck, t: d.home.why[1].title },
    { icon: Truck, t: d.home.why[2].title },
    { icon: RotateCcw, t: d.home.why[3].title },
  ];
  return (
    <footer className="mt-24 border-t border-white/10 bg-ink text-white">
      <div className="border-b border-white/10">
        <ul className="container-x grid grid-cols-2 gap-4 py-6 lg:grid-cols-4">
          {perks.map(({ icon: Icon, t }) => (
            <li key={t} className="flex items-center gap-3 text-sm font-medium">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo locale={locale} light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">{d.footer.about}</p>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold">{d.footer.shop}</h3>
          <ul className="space-y-2.5">
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
          <ul className="space-y-2.5">
            {[
              ["track", d.nav.track],
              ["info/shipping", d.footer.shipping],
              ["info/returns", d.footer.returns],
              ["info/contact", d.footer.contact],
              ["info/about", d.footer.aboutUs],
              ["info/privacy", d.footer.privacy],
              ["info/terms", d.footer.terms],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={localePath(locale, `/${href}`)} className={link}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold">{d.footer.followUs}</h3>
          <ul className="space-y-3 text-sm text-white/70">
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <a href={`mailto:${store.contact.email}`} className="hover:text-white" dir="ltr">{store.contact.email}</a>
            </li>
            <li className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <a href={`tel:${store.contact.phone.replace(/\s/g, "")}`} className="hover:text-white" dir="ltr">{store.contact.phone}</a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{store.contact.address}</span>
            </li>
          </ul>
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
