import "server-only";
import type { Order } from "@/db/schema";

/** Where the browser is sent to pay: a form posted to the Payzone payment page. */
export type CardCheckout = { url: string; fields: Record<string, string> };
/** What a verified Payzone notification says about one payment. */
export type CardNotice = { orderNumber: string; amount: number; paid: boolean; ref: string };

/**
 * Account settings, set in Vercel: PAYZONE_PAYWALL_URL (payment page), PAYZONE_MERCHANT_ACCOUNT,
 * PAYZONE_SECRET_KEY (signs requests) and PAYZONE_NOTIFICATION_KEY (checks Payzone's callbacks).
 */
const config = () => ({
  url: process.env.PAYZONE_PAYWALL_URL ?? "",
  merchant: process.env.PAYZONE_MERCHANT_ACCOUNT ?? "",
  secret: process.env.PAYZONE_SECRET_KEY ?? "",
  notificationKey: process.env.PAYZONE_NOTIFICATION_KEY ?? "",
});

/**
 * Flipped to true once buildCheckout / readNotice follow Payzone's merchant integration guide
 * (field names, signature and callback format are only published to merchants).
 */
const IMPLEMENTED = false;

/** Card payment is offered only when the integration is complete and every key is set. */
export function payzoneReady() {
  const c = config();
  return IMPLEMENTED && !!(c.url && c.merchant && c.secret && c.notificationKey);
}

/** The signed payment request for an order's advance. `returnUrl` brings the customer back; `notifyUrl` receives the result. */
export function buildCheckout(order: Order, urls: { returnUrl: string; cancelUrl: string; notifyUrl: string }): CardCheckout {
  void order;
  void urls;
  throw new Error("Payzone integration not implemented yet");
}

/** Reads and verifies a callback from Payzone; null when the signature or payload is not valid. */
export async function readNotice(req: Request): Promise<CardNotice | null> {
  void req;
  throw new Error("Payzone integration not implemented yet");
}
