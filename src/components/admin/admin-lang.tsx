"use client";

import { createContext, useContext, useTransition } from "react";
import { Languages } from "lucide-react";
import { setAdminLang } from "@/app/actions/admin-lang";
import { translate, type AdminLang } from "@/lib/admin-i18n";

const LangContext = createContext<AdminLang>("fr");

export function AdminLangProvider({ lang, children }: { lang: AdminLang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export const useAdminLang = () => useContext(LangContext);

/** Translator for client components, same keys as the server's `getT`. */
export function useT() {
  const lang = useContext(LangContext);
  return Object.assign((s: string, vars?: Record<string, string | number>) => translate(lang, s, vars), { lang });
}

/** FR / AR switch; the choice is kept in a cookie for this browser. */
export function LangSwitch({ className }: { className?: string }) {
  const lang = useContext(LangContext);
  const [pending, start] = useTransition();
  const next: AdminLang = lang === "fr" ? "ar" : "fr";
  return (
    <button type="button" disabled={pending} onClick={() => start(() => setAdminLang(next))} className={className}>
      <Languages className="h-4.5 w-4.5" aria-hidden="true" />
      {next === "ar" ? "العربية" : "Français"}
    </button>
  );
}
