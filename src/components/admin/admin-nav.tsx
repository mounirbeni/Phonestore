"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ExternalLink,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  ShoppingCart,
  Ticket,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import type { Perm } from "@/lib/auth";
import { logout } from "@/app/actions/admin";
import { cn } from "@/lib/utils";
import { LangSwitch, useT } from "@/components/admin/admin-lang";

type Item = { href: string; label: string; icon: typeof Package; perm: Perm; exact?: boolean };

/** Menu sections; labels are translation keys. */
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "المبيعات",
    items: [
      { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard, perm: "dashboard", exact: true },
      { href: "/admin/deliveries", label: "توصيلاتي", icon: Truck, perm: "deliveries" },
      { href: "/admin/orders", label: "الطلبات", icon: ShoppingCart, perm: "orders" },
      { href: "/admin/stats", label: "الإحصائيات", icon: BarChart3, perm: "stats" },
      { href: "/admin/customers", label: "العملاء", icon: Users, perm: "customers" },
    ],
  },
  {
    label: "الكتالوج",
    items: [
      { href: "/admin/products", label: "المنتجات", icon: Package, perm: "catalog" },
      { href: "/admin/products/bulk", label: "المخزون والأسعار", icon: Boxes, perm: "catalog" },
      { href: "/admin/categories", label: "الفئات", icon: FolderTree, perm: "catalog" },
      { href: "/admin/coupons", label: "أكواد الخصم", icon: Ticket, perm: "coupons" },
    ],
  },
  {
    label: "التواصل والفريق",
    items: [
      { href: "/admin/newsletter", label: "النشرة البريدية", icon: Mail, perm: "customers" },
      { href: "/admin/team", label: "الفريق", icon: UserCog, perm: "team" },
    ],
  },
];

/** The menu entry for the current page: the longest matching link (so /admin/products/bulk is not "Products"). */
function activeHref(path: string, items: Item[]) {
  return items
    .filter((i) => (i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

function Badge({ n, active }: { n?: number; active?: boolean }) {
  if (!n) return null;
  return (
    <span className={cn("ms-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[0.7rem] font-bold tabular-nums", active ? "bg-white text-brand" : "bg-brand text-white")}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

export function AdminNav({ storeName, perms, name, roleLabel, badges = {} }: { storeName: string; perms: Perm[]; name: string; roleLabel: string; badges?: Record<string, number> }) {
  const T = useT();
  const path = usePathname();
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => perms.includes(i.perm)) })).filter((g) => g.items.length);
  const items = groups.flatMap((g) => g.items);
  const current = activeHref(path, items);
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-line bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5" dir="ltr">
          <Image src="/logo.png" alt={storeName} width={1600} height={247} sizes="200px" priority className="h-7 w-auto" />
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {groups.map((g) => (
            <div key={g.label}>
              {groups.length > 1 && <p className="px-3.5 pb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-muted">{T(g.label)}</p>}
              <div className="space-y-0.5">
                {g.items.map(({ href, label, icon: Icon }) => {
                  const active = href === current;
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition", active ? "bg-brand text-white shadow-[0_8px_24px_-10px] shadow-brand" : "text-ink-2 hover:bg-mist hover:text-fg")}
                    >
                      <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                      {T(label)}
                      <Badge n={badges[href]} active={active} />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <div className="flex items-center gap-3 px-3.5 pb-2 pt-1">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/15 text-sm font-bold text-brand">{name.trim().charAt(0).toUpperCase()}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{name}</p>
              <p className="truncate text-xs text-muted">{roleLabel}</p>
            </div>
          </div>
          <Link href="/fr" target="_blank" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-2 hover:bg-mist">
            <ExternalLink className="h-4.5 w-4.5" aria-hidden="true" />
            {T("عرض المتجر")}
          </Link>
          <LangSwitch className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-2 hover:bg-mist" />
          <form action={logout}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-hot hover:bg-hot-50">
              <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
              {T("تسجيل الخروج")}
            </button>
          </form>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around overflow-x-auto border-t border-line bg-surface/95 p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur scrollbar-none lg:hidden" aria-label={T("القائمة")}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === current;
          return (
            <Link key={href} href={href} className={cn("relative flex min-w-[3.6rem] flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.65rem] font-medium", active ? "bg-brand text-white" : "text-ink-2")}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="max-w-full truncate">{T(label)}</span>
              {!!badges[href] && <span className="absolute end-1.5 top-1 h-2 w-2 rounded-full bg-brand ring-2 ring-surface" aria-hidden="true" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
