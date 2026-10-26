import Link from "next/link";
import { ChevronRight, RefreshCw, ShieldCheck } from "lucide-react";
import type { Dict } from "@/lib/dictionary";
import { localePath, type Locale } from "@/lib/i18n";
import { fmt } from "@/lib/utils";

type Props = { locale: Locale; d: Dict; basePath: string; title: string };

/** Step 1 for phones: new or second-hand. */
export function ConditionChooser({ locale, d, basePath, counts, title }: Props & { counts: { new: number; used: number } }) {
  const items = [
    { href: `${basePath}?etat=neuf`, icon: ShieldCheck, title: d.condition.newTitle, text: d.condition.newText, n: counts.new, tone: "bg-brand-50 text-brand" },
    { href: `${basePath}?etat=occasion`, icon: RefreshCw, title: d.condition.usedTitle, text: d.condition.usedText, n: counts.used, tone: "bg-warn-50 text-warn" },
  ];
  return (
    <div className="container-x pb-10 pt-6 sm:pt-12">
      <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-4xl">{title}</h1>
      <p className="mb-6 mt-2 text-muted sm:mb-8">{d.condition.chooseType}</p>
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-5">
        {items.map(({ href, icon: Icon, title: t, text, n, tone }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex min-h-28 items-center gap-4 rounded-3xl border border-line bg-surface p-5 transition active:scale-[0.985] hover:border-brand hover:shadow-card sm:min-h-40 sm:flex-col sm:items-start sm:justify-between sm:p-7"
            >
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${tone}`}>
                <Icon className="h-7 w-7" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold">{t}</span>
                <span className="mt-0.5 block text-sm text-muted">{text}</span>
                <span className="mt-1.5 block text-xs font-semibold text-fg-2">{fmt(n === 1 ? d.shop.resultsOne : d.shop.results, { n })}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 sm:hidden" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <Link href={`${basePath}?all=1`} className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        {d.condition.seeAll}
        <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      </Link>
    </div>
  );
}

/** Step 2: brands that have products in the chosen condition. */
export function BrandChooser({
  locale,
  d,
  basePath,
  title,
  etat,
  brands,
}: Props & { etat: "neuf" | "occasion"; brands: { brand: string; n: number }[] }) {
  const label = etat === "neuf" ? d.condition.new : d.condition.used;
  const total = brands.reduce((n, b) => n + b.n, 0);
  const tile =
    "flex h-24 flex-col items-center justify-center gap-1 rounded-3xl border border-line bg-surface px-3 text-center transition active:scale-[0.97] hover:border-brand hover:shadow-card sm:h-28";
  return (
    <div className="container-x pb-10 pt-6 sm:pt-12">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-4xl">{title}</h1>
        <span className={`chip ${etat === "neuf" ? "bg-brand-50 text-brand" : "bg-warn-50 text-warn"}`}>{label}</span>
        <Link href={basePath} className="ms-auto inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline">
          {d.condition.change}
        </Link>
      </div>
      <p className="mb-6 text-muted sm:mb-8">{d.condition.chooseBrand}</p>
      {brands.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line py-14 text-center text-muted">{d.condition.none}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          <li>
            <Link href={`${basePath}?etat=${etat}&all=1`} className={`${tile} !border-brand/60`}>
              <span className="text-base font-extrabold text-brand">{d.condition.allBrands}</span>
              <span className="text-xs text-muted">{fmt(total === 1 ? d.shop.resultsOne : d.shop.results, { n: total })}</span>
            </Link>
          </li>
          {brands.map((b) => (
            <li key={b.brand}>
              <Link href={`${basePath}?etat=${etat}&brand=${encodeURIComponent(b.brand)}`} className={tile}>
                <span className="text-lg font-extrabold tracking-tight" dir="ltr">{b.brand}</span>
                <span className="text-xs text-muted">{fmt(b.n === 1 ? d.shop.resultsOne : d.shop.results, { n: b.n })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
