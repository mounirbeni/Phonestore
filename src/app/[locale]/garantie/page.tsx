import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath } from "@/lib/i18n";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ code?: string; e?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).warranty.lookupTitle, robots: { index: false } } : {};
}

/** Warranty lookup by the code printed on the invoice. */
export default async function WarrantyLookup({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale).warranty;
  const { code, e } = await searchParams;
  const clean = (code ?? "").trim().toLowerCase().replace(/[^0-9a-f]/g, "");
  if (clean) redirect(localePath(locale, `/garantie/${clean}`));
  return (
    <div className="container-x grid min-h-[60vh] place-items-center py-12">
      <form className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <ShieldCheck className="h-10 w-10 text-brand" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{d.lookupTitle}</h1>
        <p className="mt-2 text-sm text-muted">{d.lookupText}</p>
        {e && <p role="alert" className="mt-4 rounded-2xl bg-hot-50 px-4 py-3 text-sm font-medium text-hot">{d.notFound}</p>}
        <label className="label mt-5" htmlFor="code">{d.code}</label>
        <input id="code" name="code" required className="input font-mono" dir="ltr" autoComplete="off" maxLength={40} />
        <button type="submit" className="btn btn-primary mt-4 w-full">{d.check}</button>
      </form>
    </div>
  );
}
