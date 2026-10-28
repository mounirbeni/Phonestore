import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { CalendarCheck, CircleAlert, MessageSquare, ShieldCheck, ShieldX } from "lucide-react";
import { db } from "@/db";
import { orders, stores, warranties } from "@/db/schema";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath, pick } from "@/lib/i18n";
import { cn, fmt } from "@/lib/utils";

type Props = { params: Promise<{ locale: string; code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).warranty.title, robots: { index: false } } : {};
}

/** Hides most of an IMEI / serial and of the name: the page is reachable by anyone holding the code. */
const maskSerial = (s: string) => (s.length > 4 ? `${"•".repeat(Math.min(s.length - 4, 11))}${s.slice(-4)}` : s);
const firstName = (s: string) => s.trim().split(/\s+/)[0] ?? "";

export default async function WarrantyPage({ params }: Props) {
  const { locale, code } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale).warranty;
  const clean = code.toLowerCase();
  if (!/^[0-9a-f]{8,40}$/.test(clean)) redirect(localePath(locale, "/garantie?e=1"));
  const [row] = await db
    .select({ w: warranties, number: orders.number, shop: stores })
    .from(warranties)
    .innerJoin(orders, eq(orders.id, warranties.orderId))
    .leftJoin(stores, eq(stores.id, warranties.storeId))
    .where(eq(warranties.code, clean))
    .limit(1);
  if (!row) redirect(localePath(locale, "/garantie?e=1"));
  const { w, number, shop } = row;
  const now = Date.now();
  const state = w.voided ? "voided" : w.endsAt.getTime() < now ? "expired" : "active";
  const daysLeft = Math.max(0, Math.ceil((w.endsAt.getTime() - now) / 86_400_000));
  const date = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "fr-FR", { dateStyle: "long", timeZone: "Africa/Casablanca" });
  const total = w.endsAt.getTime() - w.startsAt.getTime();
  const pct = state === "active" && total > 0 ? Math.min(100, Math.max(0, ((now - w.startsAt.getTime()) / total) * 100)) : 100;
  const Icon = state === "active" ? ShieldCheck : state === "expired" ? CircleAlert : ShieldX;
  const rows: [string, React.ReactNode][] = [
    [d.product, <>{w.productName}{w.variantLabel ? <span className="text-muted"> · {w.variantLabel}</span> : null}</>],
    ...(w.serial ? [[d.serial, <span key="s" className="font-mono" dir="ltr">{maskSerial(w.serial)}</span>] as [string, React.ReactNode]] : []),
    [d.duration, w.months === 1 ? d.oneMonth : fmt(d.months, { n: w.months })],
    [d.start, date.format(w.startsAt)],
    [d.end, date.format(w.endsAt)],
    ...(shop ? [[d.shop, pick(locale, shop.nameFr, shop.nameAr)] as [string, React.ReactNode]] : []),
    ...(w.customerName ? [[d.customer, firstName(w.customerName)] as [string, React.ReactNode]] : []),
    [d.order, <span key="o" dir="ltr">{number}</span>],
  ];

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="mx-auto max-w-xl">
        <div className={cn("rounded-3xl border p-6 sm:p-8", state === "active" ? "border-ok/30 bg-ok-50" : "border-line bg-surface")}>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{d.title}</p>
          <div className="mt-3 flex items-center gap-3">
            <Icon className={cn("h-9 w-9 shrink-0", state === "active" ? "text-ok" : state === "expired" ? "text-warn" : "text-hot")} aria-hidden="true" />
            <h1 className="text-2xl font-extrabold tracking-tight">{d[state]}</h1>
          </div>
          {state === "active" && (
            <>
              <p className="mt-2 flex items-center gap-2 text-sm font-medium"><CalendarCheck className="h-4 w-4" aria-hidden="true" />{fmt(d.daysLeft, { n: daysLeft })}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/60" aria-hidden="true"><div className="h-full rounded-full bg-ok" style={{ width: `${pct}%` }} /></div>
            </>
          )}
          <p className="mt-4 font-mono text-xs text-muted" dir="ltr">{w.code}</p>
        </div>

        <dl className="mt-5 divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[2fr_3fr] gap-4 px-5 py-3.5 text-sm">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-5 text-sm text-muted">{d.covers} <Link href={localePath(locale, "/info/returns")} className="font-medium text-fg underline">{d.termsLink}</Link></p>

        {state === "active" && (
          <div className="mt-6 rounded-3xl border border-line bg-surface p-5">
            <p className="font-bold">{d.claim}</p>
            <p className="mt-1 text-sm text-muted">{d.claimText}</p>
            <Link href={localePath(locale, "/info/contact")} className="btn btn-primary mt-4"><MessageSquare className="h-4.5 w-4.5" aria-hidden="true" />{d.claimBtn}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
