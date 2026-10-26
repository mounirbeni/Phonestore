import type { Category } from "@/db/schema";
import { pick, type Locale } from "./i18n";

export type MenuChild = { label: string; href: string };
export type MenuItem = {
  id: string;
  label: string;
  href: string;
  /** Shown in red (promotions). */
  tone?: "hot";
  icon?: string;
  children?: MenuChild[];
};

export type MenuBrands = { byCategory: Record<string, string[]>; all: string[] };

type ChildDef = { fr?: string; ar?: string; href?: string; cat?: string };
type Def = {
  id: string;
  fr?: string;
  ar?: string;
  href?: string;
  cat?: string;
  tone?: "hot";
  /** "brands": brands sold in the category · "allBrands": site-wide brands · or a fixed list. */
  children?: "brands" | "allBrands" | ChildDef[];
};

/** The storefront menu, in display order. Edit here to add or reorder entries. */
const MENU: Def[] = [
  { id: "home", fr: "Accueil", ar: "الرئيسية", href: "/" },
  { id: "deals", fr: "Les Promos", ar: "العروض", href: "/shop?deals=1", tone: "hot" },
  { id: "new", fr: "Nouveautés", ar: "وصل حديثًا", href: "/shop?new=1&sort=new" },
  { id: "mobility", cat: "mobilite-electrique" },
  { id: "phones", cat: "telephones", children: "brands" },
  {
    id: "accessories",
    cat: "accessoires",
    children: [
      { fr: "Chargeurs", ar: "الشواحن", href: "/c/accessoires?q=chargeur" },
      { fr: "Câbles", ar: "الكوابل", href: "/c/accessoires?q=c%C3%A2ble" },
      { fr: "Coques", ar: "الأغطية", href: "/c/accessoires?q=coque" },
      { fr: "Batteries externes", ar: "البطاريات الخارجية", href: "/c/accessoires?q=batterie" },
      { cat: "montres-connectees" },
      { cat: "audio" },
    ],
  },
  { id: "laptops", cat: "laptops", children: "brands" },
  { id: "tablets", cat: "tablettes", children: "brands" },
  { id: "tvs", cat: "televiseurs", children: "brands" },
  {
    id: "appliances",
    cat: "electromenagers",
    children: [
      { fr: "Aspirateurs", ar: "المكانس", href: "/c/electromenagers?q=aspirateur" },
      { fr: "Friteuses", ar: "القلايات", href: "/c/electromenagers?q=friteuse" },
    ],
  },
  { id: "brands", fr: "Marques", ar: "العلامات التجارية", href: "/brands", children: "allBrands" },
];

const SEE_ALL = { fr: "Voir tout", ar: "عرض الكل" };
const ALL_BRANDS = { fr: "Toutes les marques", ar: "كل العلامات" };

export function buildMenu(locale: Locale, cats: Category[], brands: MenuBrands): MenuItem[] {
  const bySlug = new Map(cats.map((c) => [c.slug, c]));
  const out: MenuItem[] = [];

  for (const def of MENU) {
    let label = pick(locale, def.fr ?? "", def.ar ?? "");
    let href = def.href ?? "/";
    let icon: string | undefined;
    if (def.cat) {
      const c = bySlug.get(def.cat);
      if (!c) continue;
      label = pick(locale, c.nameFr, c.nameAr);
      href = `/c/${c.slug}`;
      icon = c.icon;
    }

    let children: MenuChild[] | undefined;
    if (def.children === "brands" && def.cat) {
      const list = (brands.byCategory[def.cat] ?? []).slice(0, 6);
      if (list.length) {
        children = [
          { label: pick(locale, SEE_ALL.fr, SEE_ALL.ar), href },
          ...list.map((b) => ({ label: b, href: `/c/${def.cat}?brand=${encodeURIComponent(b)}` })),
        ];
      }
    } else if (def.children === "allBrands") {
      const list = brands.all.slice(0, 8);
      children = [
        { label: pick(locale, ALL_BRANDS.fr, ALL_BRANDS.ar), href: "/brands" },
        ...list.map((b) => ({ label: b, href: `/shop?brand=${encodeURIComponent(b)}` })),
      ];
    } else if (Array.isArray(def.children)) {
      const kids: MenuChild[] = [{ label: pick(locale, SEE_ALL.fr, SEE_ALL.ar), href }];
      for (const k of def.children) {
        if (k.cat) {
          const c = bySlug.get(k.cat);
          if (c) kids.push({ label: pick(locale, c.nameFr, c.nameAr), href: `/c/${c.slug}` });
        } else kids.push({ label: pick(locale, k.fr ?? "", k.ar ?? ""), href: k.href ?? href });
      }
      children = kids;
    }

    out.push({ id: def.id, label, href, tone: def.tone, icon, children });
  }
  return out;
}
