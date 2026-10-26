import type { MetadataRoute } from "next";
import { store } from "@/config/store";
import { getSitemapEntries } from "@/db/queries";
import { locales } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories } = await getSitemapEntries();
  const entry = (path: string, priority: number, lastModified?: Date) => ({
    url: `${store.url}/fr${path}`,
    lastModified,
    priority,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${store.url}/${l}${path}`])) },
  });
  return [
    entry("", 1),
    entry("/shop", 0.9),
    ...categories.map((c) => entry(`/c/${c.slug}`, 0.8)),
    ...products.map((p) => entry(`/p/${p.slug}`, 0.7, p.at)),
    ...["shipping", "returns", "about", "contact"].map((s) => entry(`/info/${s}`, 0.3)),
  ];
}
