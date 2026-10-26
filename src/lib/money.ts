import type { Locale } from "./i18n";

const cache = new Map<string, Intl.NumberFormat>();

/** Formats euro cents. Arabic keeps Latin digits for consistency with prices elsewhere. */
export function formatPrice(cents: number, locale: Locale = "fr") {
  const tag = locale === "ar" ? "ar-u-nu-latn" : "fr-FR";
  let f = cache.get(tag);
  if (!f) {
    f = new Intl.NumberFormat(tag, { style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 === 0 ? 0 : 2 });
    cache.set(tag, f);
  }
  // Fractional prices always show 2 decimals; whole prices show none.
  if (cents % 100 !== 0) {
    return new Intl.NumberFormat(tag, { style: "currency", currency: "EUR" }).format(cents / 100);
  }
  return f.format(cents / 100);
}

export function discountPercent(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}
