import "server-only";
import { cookies } from "next/headers";
import { ADMIN_LANG_COOKIE, translate, type AdminLang } from "@/lib/admin-i18n";

/** The dashboard language chosen with the FR / AR switch; French by default. */
export async function getAdminLang(): Promise<AdminLang> {
  return (await cookies()).get(ADMIN_LANG_COOKIE)?.value === "ar" ? "ar" : "fr";
}

/** Translator for server components: `T("الطلبات")` → "Commandes" in French. */
export async function getT() {
  const lang = await getAdminLang();
  return Object.assign((s: string, vars?: Record<string, string | number>) => translate(lang, s, vars), { lang });
}
