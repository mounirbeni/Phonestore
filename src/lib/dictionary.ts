import { ar } from "@/dictionaries/ar";
import { fr, type Dict } from "@/dictionaries/fr";
import type { Locale } from "./i18n";

export type { Dict };

export function getDictionary(locale: Locale): Dict {
  return locale === "ar" ? ar : fr;
}
