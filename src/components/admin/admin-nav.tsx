"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, FolderTree, LayoutDashboard, LogOut, Mail, Package, ShoppingCart, Ticket, Truck, UserCog, Users } from "lucide-react";
import type { Perm } from "@/lib/auth";
import { logout } from "@/app/actions/admin";
import { cn } from "@/lib/utils";
import { LangSwitch, useT } from "@/components/admin/admin-lang";

const ALL: { href: string; label: string; icon: typeof Package; perm: Perm; exact?: boolean }[] = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard, perm: "dashboard", exact: true },
  { href: "/admin/deliveries", label: "توصيلاتي", icon: Truck, perm: "deliveries" },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingCart, perm: "orders" },
  { href: "/admin/customers", label: "العملاء", icon: Users, perm: "customers" },
  { href: "/admin/newsletter", label: "النشرة البريدية", icon: Mail, perm: "customers" },
  { href: "/admin/products", label: "المنتجات", icon: Package, perm: "catalog" },
  { href: "/admin/categories", label: "الفئات", icon: FolderTree, perm: "catalog" },
  { href: "/admin/coupons", label: "أكواد الخصم", icon: Ticket, perm: "coupons" },
  { href: "/admin/team", label: "الفريق", icon: UserCog, perm: "team" },
];

export function AdminNav({ storeName, perms, name, roleLabel }: { storeName: string; perms: Perm[]; name: string; roleLabel: string }) {
  const T = useT();
  const path = usePathname();
  const items = ALL.filter((i) => perms.includes(i.perm));
  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-e border-line bg-surface lg:flex">
        <div className="flex h-16 items-center border-b border-line px-5" dir="ltr">
          <Image src="/logo.png" alt={storeName} width={1600} height={247} sizes="200px" priority className="h-7 w-auto" />
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? path === href : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition", active ? "bg-brand text-white" : "text-ink-2 hover:bg-mist")}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                {T(label)}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <div className="px-3.5 pb-2 pt-1">
            <p className="truncate text-sm font-bold">{name}</p>
            <p className="text-xs text-muted">{roleLabel}</p>
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

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around overflow-x-auto border-t border-line bg-surface/95 p-1.5 backdrop-blur scrollbar-none lg:hidden" aria-label={T("القائمة")}>
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path.startsWith(href);
          return (
            <Link key={href} href={href} className={cn("flex min-w-[3.6rem] flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.65rem] font-medium", active ? "bg-brand text-white" : "text-ink-2")}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{T(label)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
