export const locales = ["fr", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export function isLocale(v: string | undefined | null): v is Locale {
  return v === "fr" || v === "ar";
}

export function dirOf(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Picks the French or Arabic variant of a bilingual field pair. */
export function pick<T extends string | null>(locale: Locale, fr: T, ar: T): T {
  return locale === "ar" && ar ? ar : fr;
}

export function localePath(locale: Locale, path = "/") {
  const p = path.startsWith("/") ? path : `/${path}`;
  return p === "/" ? `/${locale}` : `/${locale}${p}`;
}

/** Swaps the leading locale segment of a pathname. */
export function switchLocalePath(pathname: string, to: Locale) {
  const rest = pathname.replace(/^\/(fr|ar)(?=\/|$)/, "");
  return `/${to}${rest}`;
}
