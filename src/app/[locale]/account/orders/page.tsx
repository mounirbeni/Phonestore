import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary } from "@/lib/dictionary";
import { customerOrders } from "@/lib/customer-orders";
import { isLocale, localePath } from "@/lib/i18n";
import { requireCustomer } from "@/lib/require-customer";
import { AccountShell } from "@/components/account/account-shell";
import { OrderList } from "@/components/account/order-list";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return isLocale(locale) ? { title: getDictionary(locale).account.myOrders, robots: { index: false } } : {};
}

export default async function OrdersPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale);
  const customer = await requireCustomer(locale, "/account/orders");
  const rows = await customerOrders(customer.id);
  return (
    <AccountShell locale={locale} d={d} name={customer.firstName} active="orders">
      {rows.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line p-8 text-center text-sm text-muted">{d.account.noOrders}</p>
      ) : (
        <OrderList locale={locale} d={d} rows={rows} />
      )}
      <p className="mt-6 text-center text-sm text-muted">
        <Link href={localePath(locale, "/track")} className="font-semibold text-brand hover:underline">{d.account.guestOrders}</Link>
      </p>
    </AccountShell>
  );
}
