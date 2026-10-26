import { store } from "@/config/store";

export type CouponLike = {
  percent: number | null;
  amountOff: number | null;
  minSubtotal: number;
};

export function couponDiscount(coupon: CouponLike | null, subtotal: number) {
  if (!coupon || subtotal < coupon.minSubtotal) return 0;
  const raw = coupon.percent ? Math.round((subtotal * coupon.percent) / 100) : (coupon.amountOff ?? 0);
  return Math.max(0, Math.min(raw, subtotal));
}

export function shippingCost(methodId: string, subtotalAfterDiscount: number) {
  const method = store.shippingMethods.find((m) => m.id === methodId);
  if (!method) return null;
  if (method.id === "standard" && subtotalAfterDiscount >= store.freeShippingThreshold) return 0;
  return method.cents;
}
