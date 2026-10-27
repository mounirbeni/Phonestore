import type { Locale } from "./i18n";

const cache = new Map<string, Intl.NumberFormat>();

/** Formats dirham amounts stored in centimes ("DH" in French, "د.م" in Arabic; Latin digits in both). */
export function formatPrice(cents: number, locale: Locale = "fr") {
  const whole = cents % 100 === 0;
  const key = `${locale}${whole}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "fr-FR", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2, useGrouping: true });
    cache.set(key, f);
  }
  return `${f.format(cents / 100)}\u00a0${locale === "ar" ? "د.م" : "DH"}`;
}

export function discountPercent(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
