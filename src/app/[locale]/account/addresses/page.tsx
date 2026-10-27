import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { getDictionary } from "@/lib/dictionary";
import { isLocale } from "@/lib/i18n";
import { requireCustomer } from "@/lib/require-customer";
import { AccountShell } from "@/components/account/account-shell";
import { AddressBook } from "@/components/account/address-book";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).account.addresses, robots: { index: false } } : {};
}

export default async function AddressesPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const customer = await requireCustomer(locale, "/account/addresses");
  const rows = await db.select().from(addresses).where(eq(addresses.customerId, customer.id)).orderBy(desc(addresses.isDefault), asc(addresses.createdAt));
  return (
    <AccountShell locale={locale} d={d} name={customer.firstName} active="addresses">
      <AddressBook rows={rows.map(({ customerId: _c, createdAt: _d, ...a }) => a)} />
    </AccountShell>
  );
}
