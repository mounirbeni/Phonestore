import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Heart, LifeBuoy, LogIn, MapPin, Package, PackageSearch, ShoppingBag, UserPlus, UserRound } from "lucide-react";
import { getDictionary } from "@/lib/dictionary";
import { getCustomer } from "@/lib/customer-auth";
import { customerOrders } from "@/lib/customer-orders";
import { isLocale, localePath } from "@/lib/i18n";
import { AccountShell } from "@/components/account/account-shell";
import { OrderList } from "@/components/account/order-list";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).account.title, robots: { index: false } } : {};
}

type Item = { href: string; icon: typeof Heart; title: string; text: string };

function Links({ locale, items }: { locale: string; items: Item[] }) {
  return (
    <ul className="space-y-3">
      {items.map(({ href, icon: Icon, title, text }) => (
        <li key={href}>
          <Link href={`/${locale}${href}`} className="flex min-h-[4.5rem] items-center gap-4 rounded-3xl border border-line bg-surface p-4 transition active:scale-[0.99] hover:border-brand">
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
  );
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const customer = await getCustomer();

  if (!customer) {
    return (
      <div className="container-x pb-10 pt-6 sm:pt-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-[1.65rem] font-extrabold tracking-tight sm:text-4xl">{d.account.title}</h1>
          <p className="mb-6 mt-2 text-muted sm:mb-8">{d.account.signUpText}</p>
          <div className="mb-8 grid gap-3 sm:grid-cols-2">
            <Link href={localePath(locale, "/account/login")} className="btn btn-brand btn-lg"><LogIn className="h-5 w-5" aria-hidden="true" />{d.account.signIn}</Link>
            <Link href={localePath(locale, "/account/register")} className="btn btn-outline btn-lg"><UserPlus className="h-5 w-5" aria-hidden="true" />{d.account.signUp}</Link>
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{d.account.guestTitle}</p>
          <Links
            locale={locale}
            items={[
              { href: "/track", icon: PackageSearch, title: d.account.orders, text: d.account.ordersText },
              { href: "/wishlist", icon: Heart, title: d.account.wishlist, text: d.account.wishlistText },
              { href: "/cart", icon: ShoppingBag, title: d.account.cart, text: d.account.cartText },
              { href: "/info/contact", icon: LifeBuoy, title: d.account.help, text: d.account.helpText },
            ]}
          />
        </div>
      </div>
    );
  }

  const recent = await customerOrders(customer.id, 3);
  return (
    <AccountShell locale={locale} d={d} name={customer.firstName} active="home">
      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">{d.account.recentOrders}</h2>
          {recent.length > 0 && <Link href={localePath(locale, "/account/orders")} className="text-sm font-semibold text-brand hover:underline">{d.common.viewAll}</Link>}
        </div>
        {recent.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-line p-6 text-center text-sm text-muted">{d.account.noOrders}</p>
        ) : (
          <OrderList locale={locale} d={d} rows={recent} />
        )}
      </section>
      <Links
        locale={locale}
        items={[
          { href: "/account/orders", icon: Package, title: d.account.myOrders, text: d.account.myOrdersText },
          { href: "/account/addresses", icon: MapPin, title: d.account.addresses, text: d.account.addressesText },
          { href: "/account/profile", icon: UserRound, title: d.account.profile, text: d.account.profileText },
          { href: "/wishlist", icon: Heart, title: d.account.wishlist, text: d.account.wishlistSynced },
          { href: "/info/contact", icon: LifeBuoy, title: d.account.help, text: d.account.helpText },
        ]}
      />
    </AccountShell>
  );
}
