"use server";

import { after } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { addresses, coupons, orderEvents, orderItems, orders, products, variants } from "@/db/schema";
import { getCustomerId } from "@/lib/customer-auth";
import { getCartVariants, getProductsBySlugs } from "@/db/queries";
import { store } from "@/config/store";
import { artKind } from "@/lib/art";
import { couponDiscount, depositFor, shippingCost } from "@/lib/pricing";
import { isolateLtr, randomToken } from "@/lib/utils";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation";
import { sendOrderEmails } from "@/lib/mail";
import { allowAll, clientIp } from "@/lib/rate-limit";
import type { CartLine } from "@/components/providers";
import { buildCheckout, payzoneReady, type CardCheckout } from "@/lib/payments/payzone";

/* ---------- cart refresh ---------- */

export async function refreshCart(items: { variantId: number; qty: number }[]) {
  const wanted = items.filter((i) => Number.isInteger(i.variantId) && i.variantId > 0).slice(0, 30);
  const rows = await getCartVariants(wanted.map((i) => i.variantId));
  const byId = new Map(rows.map((r) => [r.variantId, r]));
  const lines: CartLine[] = [];
  let changed = false;
  for (const it of wanted) {
    const r = byId.get(it.variantId);
    if (!r || !r.active || r.stock <= 0) {
      changed = true;
      continue;
    }
    const qty = Math.max(1, Math.min(Math.floor(it.qty) || 1, r.stock, store.maxQtyPerLine));
    lines.push({
      variantId: r.variantId,
      slug: r.slug,
      name: r.name,
      variantLabel: {
        fr: [r.colorFr, r.storage].filter(Boolean).join(" · "),
        ar: [r.colorAr || r.colorFr, isolateLtr(r.storage)].filter(Boolean).join(" · "),
      },
      colorHex: r.colorHex,
      image: r.images[0] ?? null,
      art: artKind(r.name, r.icon),
      price: r.price,
      compareAt: r.compareAt && r.compareAt > r.price ? r.compareAt : null,
      qty,
      stock: r.stock,
    });
    if (qty !== it.qty) changed = true;
  }
  return { lines, changed };
}

/* ---------- coupons ---------- */

export type CouponResult =
  | { ok: true; code: string; discount: number }
  | { ok: false; reason: "invalid" | "min" | "rate" };

async function findCoupon(code: string) {
  const [c] = await db.select().from(coupons).where(eq(coupons.code, code.trim().toUpperCase())).limit(1);
  if (!c || !c.active || (c.maxUses != null && c.usedCount >= c.maxUses)) return null;
  return c;
}

export async function validateCoupon(code: string, subtotal: number): Promise<CouponResult> {
  if (typeof code !== "string" || code.length > 40) return { ok: false, reason: "invalid" };
  if (!(await allowAll([[`coupon:ip:${await clientIp()}`, 30, 900]]))) return { ok: false, reason: "rate" };
  const c = await findCoupon(code);
  if (!c) return { ok: false, reason: "invalid" };
  if (subtotal < c.minSubtotal) return { ok: false, reason: "min" };
  return { ok: true, code: c.code, discount: couponDiscount(c, subtotal) };
}

/* ---------- place order ---------- */

export type PlaceOrderResult =
  | { ok: true; number: string; token: string }
  | { ok: false; error: "invalid" | "empty" | "stock" | "coupon" | "rate" | "server"; fields?: string[]; name?: string };

class StockError extends Error {
  constructor(public productName: string) {
    super("stock");
  }
}

export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
  }
  const data = parsed.data;
  // Orders cost nothing to place (the advance is paid later by transfer), so cap them per network to stop fake orders draining stock.
  if (!(await allowAll([[`order:ip:${await clientIp()}`, 8, 3600], [`order:phone:${data.phone.replace(/\D/g, "")}`, 5, 3600]]))) {
    return { ok: false, error: "rate" };
  }
  // Linked server-side from the session cookie, never from the form.
  const customerId = await getCustomerId();

  // Merge duplicate variant lines.
  const qtyById = new Map<number, number>();
  for (const it of data.items) qtyById.set(it.variantId, (qtyById.get(it.variantId) ?? 0) + it.qty);
  if (!qtyById.size) return { ok: false, error: "empty" };
  if ([...qtyById.values()].some((q) => q > store.maxQtyPerLine)) return { ok: false, error: "invalid", fields: ["items"] };

  try {
    const created = await db.transaction(async (tx) => {
      const ids = [...qtyById.keys()];
      const locked = await tx.select().from(variants).where(inArray(variants.id, ids)).for("update");
      if (locked.length !== ids.length) throw new StockError("");
      const prods = await tx
        .select()
        .from(products)
        .where(inArray(products.id, [...new Set(locked.map((v) => v.productId))]));
      const prodById = new Map(prods.map((p) => [p.id, p]));

      let subtotal = 0;
      const lines = locked.map((v) => {
        const p = prodById.get(v.productId);
        const qty = qtyById.get(v.id)!;
        if (!p || !p.active || v.stock < qty) throw new StockError(p?.name ?? "");
        subtotal += v.price * qty;
        return { v, p, qty };
      });

      let discount = 0;
      let couponCode: string | null = null;
      if (data.couponCode) {
        const c = await findCoupon(data.couponCode);
        if (!c || subtotal < c.minSubtotal) return { error: "coupon" as const };
        discount = couponDiscount(c, subtotal);
        const upd = await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(and(eq(coupons.id, c.id), sql`(${coupons.maxUses} is null or ${coupons.usedCount} < ${coupons.maxUses})`))
          .returning({ id: coupons.id });
        if (!upd.length) return { error: "coupon" as const };
        couponCode = c.code;
      }

      const ship = shippingCost(data.shippingMethod) ?? 0;
      const total = subtotal - discount + ship;
      const token = randomToken(12);

      const [order] = await tx
        .insert(orders)
        .values({
          token,
          locale: data.locale,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          address2: data.address2,
          city: data.city,
          postalCode: data.postalCode,
          country: data.country,
          shippingMethod: data.shippingMethod,
          paymentMethod: "cod",
          couponCode,
          subtotal,
          discount,
          shippingCost: ship,
          total,
          deposit: depositFor(total),
          customerNote: data.note,
          customerId,
        })
        .returning();
      await tx.insert(orderEvents).values({ orderId: order.id, kind: "status", status: "pending", by: "client" });
      const number = `ES-${10000 + order.id}`;
      const [finalOrder] = await tx.update(orders).set({ number }).where(eq(orders.id, order.id)).returning();

      const items = await tx
        .insert(orderItems)
        .values(
          lines.map(({ v, p, qty }) => ({
            orderId: order.id,
            variantId: v.id,
            productSlug: p.slug,
            name: p.name,
            variantLabel: [data.locale === "ar" ? v.colorAr || v.colorFr : v.colorFr, data.locale === "ar" ? isolateLtr(v.storage) : v.storage].filter(Boolean).join(" · "),
            colorHex: v.colorHex,
            image: p.images[0] ?? null,
            unitPrice: v.price,
            quantity: qty,
          })),
        )
        .returning();

      for (const { v, qty } of lines) {
        await tx
          .update(variants)
          .set({ stock: sql`${variants.stock} - ${qty}` })
          .where(eq(variants.id, v.id));
      }
      // A signed-in customer's first delivery address is kept for next time.
      if (customerId) {
        const [saved] = await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.customerId, customerId)).limit(1);
        if (!saved) {
          await tx.insert(addresses).values({
            customerId,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            address: data.address,
            address2: data.address2,
            city: data.city,
            postalCode: data.postalCode,
            country: data.country,
            isDefault: true,
          });
        }
      }
      return { order: finalOrder, items };
    });

    if ("error" in created) return { ok: false, error: "coupon" };
    // Runs after the response is sent; a bare promise can be cut off when the serverless function freezes.
    after(() => sendOrderEmails(created.order, created.items));
    return { ok: true, number: created.order.number, token: created.order.token };
  } catch (e) {
    if (e instanceof StockError) return { ok: false, error: "stock", name: e.productName };
    console.error("placeOrder failed", e);
    return { ok: false, error: "server" };
  }
}

/* ---------- order lookup ---------- */

export async function lookupOrder(number: string, email: string): Promise<{ ok: true; token: string; number: string } | { ok: false; rate?: true }> {
  if (typeof number !== "string" || typeof email !== "string" || number.length > 30 || email.length > 120) return { ok: false };
  if (!(await allowAll([[`lookup:ip:${await clientIp()}`, 20, 900]]))) return { ok: false, rate: true };
  const n = number.trim().toUpperCase().replace(/^#/, "");
  const normalized = /^\d+$/.test(n) ? `ES-${n}` : n;
  const [o] = await db
    .select({ number: orders.number, token: orders.token })
    .from(orders)
    .where(and(eq(orders.number, normalized), eq(orders.email, email.trim().toLowerCase())))
    .limit(1);
  return o ? { ok: true, ...o } : { ok: false };
}

/* ---------- wishlist ---------- */

export async function getWishlistCards(slugs: string[]) {
  return getProductsBySlugs(slugs.filter((s) => typeof s === "string").slice(0, 60));
}

/* ---------- card payment of the advance ---------- */

/** Builds the Payzone request for an order still waiting for its advance (the private link's token is required). */
export async function startCardPayment(number: string, token: string): Promise<{ ok: true; checkout: CardCheckout } | { ok: false; error: "unavailable" | "rate" }> {
  if (!payzoneReady() || typeof number !== "string" || typeof token !== "string" || number.length > 30 || token.length > 64) return { ok: false, error: "unavailable" };
  if (!(await allowAll([[`card:ip:${await clientIp()}`, 20, 900]]))) return { ok: false, error: "rate" };
  const [o] = await db.select().from(orders).where(and(eq(orders.number, number), eq(orders.token, token))).limit(1);
  if (!o || o.status !== "pending" || o.deposit <= 0 || o.depositPaidAt) return { ok: false, error: "unavailable" };
  const page = `${store.url}/${o.locale === "ar" ? "ar" : "fr"}/order/${o.number}?t=${o.token}`;
  return {
    ok: true,
    checkout: buildCheckout(o, { returnUrl: `${page}&pay=ok`, cancelUrl: `${page}&pay=fail`, notifyUrl: `${store.url}/api/payments/payzone` }),
  };
}
