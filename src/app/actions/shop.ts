"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { coupons, orderItems, orders, products, variants } from "@/db/schema";
import { getCartVariants, getProductsBySlugs } from "@/db/queries";
import { store } from "@/config/store";
import { artKind } from "@/lib/art";
import { couponDiscount, shippingCost } from "@/lib/pricing";
import { isolateLtr, randomToken } from "@/lib/utils";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation";
import { sendOrderEmails } from "@/lib/mail";
import type { CartLine } from "@/components/providers";

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
  | { ok: false; reason: "invalid" | "min" };

async function findCoupon(code: string) {
  const [c] = await db.select().from(coupons).where(eq(coupons.code, code.trim().toUpperCase())).limit(1);
  if (!c || !c.active || (c.maxUses != null && c.usedCount >= c.maxUses)) return null;
  return c;
}

export async function validateCoupon(code: string, subtotal: number): Promise<CouponResult> {
  const c = await findCoupon(code);
  if (!c) return { ok: false, reason: "invalid" };
  if (subtotal < c.minSubtotal) return { ok: false, reason: "min" };
  return { ok: true, code: c.code, discount: couponDiscount(c, subtotal) };
}

/* ---------- place order ---------- */

export type PlaceOrderResult =
  | { ok: true; number: string; token: string }
  | { ok: false; error: "invalid" | "empty" | "stock" | "coupon" | "server"; fields?: string[]; name?: string };

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

  // Merge duplicate variant lines.
  const qtyById = new Map<number, number>();
  for (const it of data.items) qtyById.set(it.variantId, (qtyById.get(it.variantId) ?? 0) + it.qty);
  if (!qtyById.size) return { ok: false, error: "empty" };

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

      const ship = shippingCost(data.shippingMethod, subtotal - discount) ?? 0;
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
          customerNote: data.note,
        })
        .returning();
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
      return { order: finalOrder, items };
    });

    if ("error" in created) return { ok: false, error: "coupon" };
    void sendOrderEmails(created.order, created.items);
    return { ok: true, number: created.order.number, token: created.order.token };
  } catch (e) {
    if (e instanceof StockError) return { ok: false, error: "stock", name: e.productName };
    console.error("placeOrder failed", e);
    return { ok: false, error: "server" };
  }
}

/* ---------- order lookup ---------- */

export async function lookupOrder(number: string, email: string): Promise<{ ok: true; token: string; number: string } | { ok: false }> {
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
