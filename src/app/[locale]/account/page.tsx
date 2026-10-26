import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Heart, LifeBuoy, PackageSearch, ShoppingBag } from "lucide-react";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).account.title, robots: { index: false } } : {};
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const items = [
    { href: "/track", icon: PackageSearch, title: d.account.orders, text: d.account.ordersText },
    { href: "/wishlist", icon: Heart, title: d.account.wishlist, text: d.account.wishlistText },
    { href: "/cart", icon: ShoppingBag, title: d.account.cart, text: d.account.cartText },
    { href: "/info/contact", icon: LifeBuoy, title: d.account.help, text: d.account.helpText },
  ];
  return (
    <div className="container-x pb-10 pt-6 sm:pt-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-[1.65rem] font-extrabold tracking-tight sm:text-4xl">{d.account.title}</h1>
        <p className="mb-6 mt-2 text-muted sm:mb-8">{d.account.text}</p>
        <ul className="space-y-3">
          {items.map(({ href, icon: Icon, title, text }) => (
            <li key={href}>
              <Link href={localePath(locale, href)} className="flex min-h-[4.5rem] items-center gap-4 rounded-3xl border border-line bg-surface p-4 transition active:scale-[0.99] hover:border-brand">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{title}</span>
                  <span className="block text-sm text-muted">{text}</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted rtl:rotate-180" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
