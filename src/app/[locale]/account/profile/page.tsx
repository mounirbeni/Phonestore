import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/dictionary";
import { isLocale } from "@/lib/i18n";
import { requireCustomer } from "@/lib/require-customer";
import { AccountShell } from "@/components/account/account-shell";
import { ProfileForms } from "@/components/account/profile-forms";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).account.profile, robots: { index: false } } : {};
}

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const c = await requireCustomer(locale, "/account/profile");
  return (
    <AccountShell locale={locale} d={d} name={c.firstName} active="profile">
      <ProfileForms firstName={c.firstName} lastName={c.lastName} phone={c.phone} email={c.email} />
    </AccountShell>
  );
}
