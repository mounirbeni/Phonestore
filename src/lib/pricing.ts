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

export function shippingCost(methodId: string) {
  const method = store.shippingMethods.find((m) => m.id === methodId);
  if (!method) return null;
  return method.cents;
}

/** The advance for an order of `total` (never more than the order itself). */
export function depositFor(total: number) {
  return Math.min(store.deposit.cents, total);
}

/** What the driver collects: the total, less the advance once it has been received. */
export function dueOnDelivery(order: { total: number; deposit: number; depositPaidAt: Date | null }) {
  return order.total - (order.depositPaidAt ? order.deposit : 0);
}
