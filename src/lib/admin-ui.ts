import { formatPrice } from "@/lib/money";
import type { OrderStatus } from "@/db/schema";

export const statusLabel: Record<OrderStatus, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكَّد",
  shipped: "قيد التوصيل",
  delivered: "تم التسليم",
  cancelled: "ملغى",
};

export const statusChip: Record<OrderStatus, string> = {
  pending: "bg-warn-50 text-warn",
  confirmed: "bg-brand-50 text-brand",
  shipped: "bg-fg text-bg",
  delivered: "bg-ok-50 text-ok",
  cancelled: "bg-hot-50 text-hot",
};

export const eur = (cents: number) => formatPrice(cents, "fr");

export const dateTime = (d: Date, lang: "fr" | "ar" = "ar") =>
  new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(d);
