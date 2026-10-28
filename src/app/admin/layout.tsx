import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-arabic";
import "../globals.css";
import { store } from "@/config/store";
import { can, getMember, ROLE_LABELS, type Perm } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { SITE_ICONS } from "@/lib/site-icons";
import { getT } from "@/lib/admin-lang";
import { AdminLangProvider, LangSwitch } from "@/components/admin/admin-lang";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const T = await getT();
  return { title: { default: T("لوحة التحكم"), template: `%s | ${T("لوحة التحكم")}` }, robots: { index: false, follow: false }, icons: SITE_ICONS };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [member, T] = await Promise.all([getMember(), getT()]);
  const perms = member ? (["dashboard", "orders", "customers", "catalog", "coupons", "team", "stats", "deliveries"] as Perm[]).filter((p) => can(member.role, p)) : [];
  return (
    <html lang={T.lang} dir={T.lang === "ar" ? "rtl" : "ltr"}>
      <body className="min-h-screen bg-mist antialiased">
        <AdminLangProvider lang={T.lang}>
        {member ? (
          <div className="flex min-h-screen">
            <AdminNav storeName={store.name} perms={perms} name={T(member.name)} roleLabel={T(ROLE_LABELS[member.role])} />
            <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10 lg:pt-8">
              <div className="mb-3 flex justify-end lg:hidden">
                <LangSwitch className="btn btn-outline btn-sm" />
              </div>
              {children}
            </main>
          </div>
        ) : (
          <>
            <div className="fixed end-4 top-4 z-10">
              <LangSwitch className="btn btn-outline btn-sm" />
            </div>
            {children}
          </>
        )}
        </AdminLangProvider>
      </body>
    </html>
  );
}
