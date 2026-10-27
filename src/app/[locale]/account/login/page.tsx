import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/lib/dictionary";
import { getCustomerId } from "@/lib/customer-auth";
import { isLocale, localePath } from "@/lib/i18n";
import { SignInForm } from "@/components/account/auth-forms";

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).account.signInTitle, robots: { index: false } } : {};
}

export default async function Page({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { next } = await searchParams;
  if (await getCustomerId()) redirect(next?.startsWith(`/${locale}/`) ? next : localePath(locale, "/account"));
  const d = getDictionary(locale);
  return (
    <div className="container-x pb-12 pt-8 sm:pt-14">
      <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{d.account.signInTitle}</h1>
        <p className="mb-6 mt-1.5 text-sm text-muted">{d.account.signInText}</p>
        <SignInForm next={next} />
      </div>
    </div>
  );
}
