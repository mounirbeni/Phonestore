"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, FolderTree, LayoutDashboard, LogOut, Package, ShoppingCart, Ticket } from "lucide-react";
import { logout } from "@/app/actions/admin";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingCart },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/categories", label: "الفئات", icon: FolderTree },
  { href: "/admin/coupons", label: "أكواد الخصم", icon: Ticket },
];

export function AdminNav({ storeName }: { storeName: string }) {
  const path = usePathname();
  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-e border-line bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5 text-lg font-extrabold" dir="ltr">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-sm text-white">P</span>
          {storeName}
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? path === href : path.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition", active ? "bg-ink text-white" : "text-ink-2 hover:bg-mist")}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <Link href="/fr" target="_blank" className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-ink-2 hover:bg-mist">
            <ExternalLink className="h-4.5 w-4.5" aria-hidden="true" />
            عرض المتجر
          </Link>
          <form action={logout}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-hot hover:bg-hot-50">
              <LogOut className="h-4.5 w-4.5" aria-hidden="true" />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-white/95 p-1.5 backdrop-blur lg:hidden" aria-label="القائمة">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path.startsWith(href);
          return (
            <Link key={href} href={href} className={cn("flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[0.65rem] font-medium", active ? "bg-ink text-white" : "text-ink-2")}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
