"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_LANG_COOKIE, type AdminLang } from "@/lib/admin-i18n";

export async function setAdminLang(lang: AdminLang) {
  (await cookies()).set(ADMIN_LANG_COOKIE, lang === "ar" ? "ar" : "fr", { path: "/admin", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true, secure: process.env.NODE_ENV === "production" });
  revalidatePath("/admin", "layout");
}
