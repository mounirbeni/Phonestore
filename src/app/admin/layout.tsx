import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-arabic";
import "../globals.css";
import { store } from "@/config/store";
import { can, getMember, ROLE_LABELS, type Perm } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { SITE_ICONS } from "@/lib/site-icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "لوحة التحكم", template: "%s | لوحة التحكم" }, robots: { index: false, follow: false }, icons: SITE_ICONS };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const member = await getMember();
  const perms = member ? (["dashboard", "orders", "customers", "catalog", "coupons", "team", "stats", "deliveries"] as Perm[]).filter((p) => can(member.role, p)) : [];
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-mist antialiased">
        {member ? (
          <div className="flex min-h-screen">
            <AdminNav storeName={store.name} perms={perms} name={member.name} roleLabel={ROLE_LABELS[member.role]} />
            <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10 lg:pt-8">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
