"use server";

import { and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orderEvents, orderItems, orders, products, staff, variants, variantStock, warranties } from "@/db/schema";
import { requirePerm, type Member } from "@/lib/auth";
import { activeStores, StockShortError, takeStock } from "@/lib/stock";
import { issueWarranties } from "@/lib/warranty";
import { randomToken } from "@/lib/utils";

/** The shop a member may sell from: a seller is tied to theirs, the others pick any active shop. */
async function tillStore(m: Member, storeId: number) {
  if (m.role === "seller") {
    const [s] = m.id ? await db.select({ storeId: staff.storeId }).from(staff).where(eq(staff.id, m.id)).limit(1) : [];
    if (!s?.storeId || s.storeId !== storeId) return null;
  }
  return (await activeStores()).find((s) => s.id === storeId) ?? null;
}

export type PosHit = {
  variantId: number;
  name: string;
  label: string;
  sku: string;
  barcode: string;
  price: number;
  image: string | null;
  qty: number;
  warrantyMonths: number;
};

/** Finds products by scanned barcode / SKU (exact) or by name, with the shop's quantity. */
export async function posSearch(q: string, storeId: number): Promise<PosHit[]> {
  const m = await requirePerm("pos");
  if (!(await tillStore(m, storeId))) return [];
  const term = q.trim().slice(0, 80);
  if (term.length < 2) return [];
  const exact = or(eq(variants.barcode, term), sql`lower(${variants.sku}) = lower(${term})`);
  const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const rows = await db
    .select({ v: variants, p: products, qty: variantStock.qty })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .leftJoin(variantStock, and(eq(variantStock.variantId, variants.id), eq(variantStock.storeId, storeId)))
    .where(and(eq(products.active, true), or(exact, ilike(products.name, like), ilike(variants.sku, like))))
    .orderBy(sql`case when ${exact} then 0 else 1 end`, asc(products.name), asc(variants.sort))
    .limit(15);
  return rows.map(({ v, p, qty }) => ({
    variantId: v.id,
    name: p.name,
    label: [v.colorFr, v.storage].filter(Boolean).join(" · "),
    sku: v.sku,
    barcode: v.barcode,
    price: v.price,
    image: p.images[0] ?? null,
    qty: qty ?? 0,
    warrantyMonths: p.warrantyMonths,
  }));
}

const saleSchema = z.object({
  storeId: z.number().int().positive(),
  lines: z
    .array(
      z.object({
        variantId: z.number().int().positive(),
        qty: z.number().int().min(1).max(50),
        /** IMEI / serial of each unit, in order; may be left empty. */
        serials: z.array(z.string().trim().max(40)).max(50).default([]),
      }),
    )
    .min(1)
    .max(40),
  /** Centimes taken off the total. */
  discount: z.number().int().min(0).default(0),
  payment: z.enum(["cash", "card", "transfer"]),
  /** Cash handed over, in centimes (for the change on the receipt). */
  received: z.number().int().min(0).default(0),
  customerName: z.string().trim().max(80).default(""),
  phone: z.string().trim().max(20).default(""),
  note: z.string().trim().max(300).default(""),
});

export type PosSaleResult = { ok: true; id: number; number: string } | { ok: false; error: "invalid" | "store" | "stock" | "discount"; name?: string };

/** Rings up a till sale: takes the units from the shop, records a delivered order and starts the warranties now. */
export async function posSale(input: z.input<typeof saleSchema>): Promise<PosSaleResult> {
  const m = await requirePerm("pos");
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const data = parsed.data;
  const shop = await tillStore(m, data.storeId);
  if (!shop) return { ok: false, error: "store" };

  const qtyById = new Map<number, { qty: number; serials: string[] }>();
  for (const l of data.lines) {
    const cur = qtyById.get(l.variantId);
    qtyById.set(l.variantId, { qty: (cur?.qty ?? 0) + l.qty, serials: [...(cur?.serials ?? []), ...l.serials] });
  }

  class Short extends Error {
    constructor(public productName: string) {
      super("stock");
    }
  }
  try {
    return await db.transaction(async (tx) => {
      const ids = [...qtyById.keys()];
      const rows = await tx.select({ v: variants, p: products }).from(variants).innerJoin(products, eq(products.id, variants.productId)).where(inArray(variants.id, ids));
      if (rows.length !== ids.length) throw new Short("");
      let subtotal = 0;
      for (const { v } of rows) subtotal += v.price * qtyById.get(v.id)!.qty;
      if (data.discount > subtotal) return { ok: false as const, error: "discount" as const };
      const total = subtotal - data.discount;
      const [first, ...rest] = data.customerName.split(/\s+/).filter(Boolean);

      const [order] = await tx
        .insert(orders)
        .values({
          token: randomToken(12),
          status: "delivered",
          locale: "fr",
          firstName: first ?? "",
          lastName: rest.join(" "),
          email: "",
          phone: data.phone,
          address: "",
          city: shop.nameFr,
          postalCode: "",
          country: "MA",
          shippingMethod: "store",
          paymentMethod: data.payment,
          subtotal,
          discount: data.discount,
          shippingCost: 0,
          total,
          deposit: 0,
          adminNote: [data.note, data.payment === "cash" && data.received >= total ? `Reçu ${(data.received / 100).toFixed(2)} · Rendu ${((data.received - total) / 100).toFixed(2)}` : ""].filter(Boolean).join("\n"),
          channel: "store",
          fulfilment: "pickup",
          storeId: shop.id,
          sellerId: m.id,
        })
        .returning();
      const number = `ES-${10000 + order.id}`;
      await tx.update(orders).set({ number }).where(eq(orders.id, order.id));
      await tx.insert(orderEvents).values({ orderId: order.id, kind: "status", status: "delivered", staffId: m.id, by: m.name, note: shop.nameFr });

      for (const { v, p } of rows) {
        const { qty } = qtyById.get(v.id)!;
        const taken = await takeStock(tx, v.id, qty, shop.id).catch((e) => {
          throw e instanceof StockShortError ? new Short(p.name) : e;
        });
        await tx.insert(orderItems).values({
          orderId: order.id,
          variantId: v.id,
          productSlug: p.slug,
          name: p.name,
          variantLabel: [v.colorFr, v.storage].filter(Boolean).join(" · "),
          colorHex: v.colorHex,
          image: p.images[0] ?? null,
          unitPrice: v.price,
          quantity: qty,
          stockFrom: taken,
        });
      }

      // Warranties start at the sale; each unit gets the IMEI typed or scanned at the till.
      await issueWarranties(tx, order.id, new Date());
      const ws = await tx
        .select({ id: warranties.id, variantId: orderItems.variantId })
        .from(warranties)
        .innerJoin(orderItems, eq(orderItems.id, warranties.orderItemId))
        .where(eq(warranties.orderId, order.id))
        .orderBy(asc(warranties.id));
      const used = new Map<number, number>();
      for (const w of ws) {
        if (w.variantId == null) continue;
        const k = used.get(w.variantId) ?? 0;
        used.set(w.variantId, k + 1);
        const serial = (qtyById.get(w.variantId)?.serials[k] ?? "").toUpperCase();
        if (serial) await tx.update(warranties).set({ serial }).where(eq(warranties.id, w.id));
      }
      return { ok: true as const, id: order.id, number };
    });
  } catch (e) {
    if (e instanceof Short) return { ok: false, error: "stock", name: e.productName };
    throw e;
  }
}
