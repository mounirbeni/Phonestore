import { formatPrice } from "@/lib/money";
import type { OrderStatus } from "@/db/schema";

export const statusLabel: Record<OrderStatus, string> = {
  pending: "قيد الانتظار",
  confirmed: "مؤكَّد",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغى",
};

export const statusChip: Record<OrderStatus, string> = {
  pending: "bg-[#fff7e6] text-[#b26a00]",
  confirmed: "bg-brand-50 text-brand",
  shipped: "bg-ink text-white",
  delivered: "bg-ok-50 text-ok",
  cancelled: "bg-hot-50 text-hot",
};

export const eur = (cents: number) => formatPrice(cents, "fr");

export const dateTime = (d: Date) =>
  new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(d);
