import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/dictionary";
import { isLocale } from "@/lib/i18n";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { getCustomer } from "@/lib/customer-auth";
import { CheckoutForm, type CheckoutPrefill } from "@/components/cart/checkout-form";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).checkout.title, robots: { index: false } } : {};
}

export default async function CheckoutPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const customer = await getCustomer();
  let prefill: CheckoutPrefill = {};
  if (customer) {
    const [a] = await db.select().from(addresses).where(and(eq(addresses.customerId, customer.id), eq(addresses.isDefault, true))).limit(1);
    prefill = {
      firstName: a?.firstName ?? customer.firstName,
      lastName: a?.lastName ?? customer.lastName,
      email: customer.email,
      phone: a?.phone ?? customer.phone,
      address: a?.address,
      address2: a?.address2,
      postalCode: a?.postalCode,
      city: a?.city,
    };
  }
  return (
    <div className="container-x pb-10 pt-8 sm:pt-12">
      <h1 className="mb-8 text-3xl font-extrabold tracking-tight sm:text-4xl">{d.checkout.title}</h1>
      <CheckoutForm prefill={prefill} />
    </div>
  );
}
