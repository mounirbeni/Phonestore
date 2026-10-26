import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-sans-arabic";
import "../globals.css";
import { store } from "@/config/store";
import { getCategories } from "@/db/queries";
import { getDictionary } from "@/lib/dictionary";
import { dirOf, isLocale, locales } from "@/lib/i18n";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileMenu } from "@/components/layout/mobile-menu";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: "#0d0d10", width: "device-width", initialScale: 1, viewportFit: "cover", colorScheme: "dark" };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const d = getDictionary(locale);
  return {
    metadataBase: new URL(store.url),
    title: { default: `${store.name} — ${d.meta.homeTitle}`, template: `%s | ${store.name}` },
    description: d.meta.homeDescription,
    alternates: { canonical: `/${locale}`, languages: { fr: "/fr", ar: "/ar" } },
    openGraph: { siteName: store.name, locale: locale === "ar" ? "ar_AR" : "fr_FR", type: "website" },
    manifest: "/manifest.webmanifest",
    icons: { icon: [{ url: "/pwa-icon/192", sizes: "192x192", type: "image/png" }], apple: [{ url: "/pwa-icon/180", sizes: "180x180", type: "image/png" }] },
    appleWebApp: { capable: true, title: store.name, statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const categories = await getCategories().catch(() => []);
  const cats = categories.map(({ slug, nameFr, nameAr, icon }) => ({ slug, nameFr, nameAr, icon }));

  return (
    <html lang={locale} dir={dirOf(locale)} data-theme="dark">
      <body className="min-h-screen antialiased">
        <Providers locale={locale} d={d}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
            {d.nav.skip}
          </a>
          <Header locale={locale} d={d} categories={cats} />
          <main id="main">{children}</main>
          <Footer locale={locale} d={d} categories={cats} />
          <BottomNav />
          <MobileMenu categories={cats} />
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}
