import "server-only";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer-auth";
import { localePath, type Locale } from "@/lib/i18n";

/** The signed-in customer, or a redirect to the sign-in page that comes back here afterwards. */
export async function requireCustomer(locale: Locale, path: string) {
  const c = await getCustomer();
  if (!c) redirect(`${localePath(locale, "/account/login")}?next=${encodeURIComponent(localePath(locale, path))}`);
  return c;
}
