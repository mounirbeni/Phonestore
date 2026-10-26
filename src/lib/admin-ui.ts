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
  shipped: "bg-[#efeaff] text-[#6a3fd6]",
  delivered: "bg-ok-50 text-ok",
  cancelled: "bg-hot-50 text-hot",
};

export const eur = (cents: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);

export const dateTime = (d: Date) =>
  new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(d);
