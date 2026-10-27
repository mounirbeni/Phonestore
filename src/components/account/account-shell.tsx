import Link from "next/link";
import { Heart, LayoutGrid, LogOut, MapPin, Package, UserRound } from "lucide-react";
import { signOut } from "@/app/actions/account";
import type { Dict } from "@/lib/dictionary";
import { localePath, type Locale } from "@/lib/i18n";
import { cn, fmt } from "@/lib/utils";

const TABS = [
  { key: "home", href: "/account", icon: LayoutGrid },
  { key: "orders", href: "/account/orders", icon: Package },
  { key: "addresses", href: "/account/addresses", icon: MapPin },
  { key: "profile", href: "/account/profile", icon: UserRound },
  { key: "wishlist", href: "/wishlist", icon: Heart },
] as const;

/** Header and tab bar shared by the signed-in account pages. */
export function AccountShell({ locale, d, name, active, children }: { locale: Locale; d: Dict; name: string; active: (typeof TABS)[number]["key"]; children: React.ReactNode }) {
  const label = { home: d.account.title, orders: d.account.myOrders, addresses: d.account.addresses, profile: d.account.profile, wishlist: d.account.wishlist };
  return (
    <div className="container-x pb-10 pt-6 sm:pt-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">{fmt(d.account.hello, { name })}</p>
            <h1 className="text-[1.65rem] font-extrabold tracking-tight sm:text-4xl">{label[active]}</h1>
          </div>
          <form action={signOut.bind(null, locale)}>
            <button type="submit" className="btn btn-ghost btn-sm text-muted"><LogOut className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />{d.account.signOut}</button>
          </form>
        </div>
        <nav className="-mx-4 mb-6 mt-4 flex gap-2 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0" aria-label={d.account.title}>
          {TABS.map(({ key, href, icon: Icon }) => (
            <Link
              key={key}
              href={localePath(locale, href)}
              aria-current={key === active ? "page" : undefined}
              className={cn("inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition", key === active ? "border-fg bg-fg text-bg" : "border-line text-fg-2 hover:border-fg")}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label[key]}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
