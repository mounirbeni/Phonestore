import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, warranties } from "@/db/schema";
import { randomToken } from "@/lib/utils";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const addMonths = (d: Date, m: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
};

/**
 * Makes sure every unit of an order has its warranty row (one per unit, so each phone carries its own IMEI).
 * `start` (sale or delivery date) resets the period of all the order's warranties; without it new rows start now.
 */
export async function issueWarranties(tx: Tx, orderId: number, start?: Date) {
  const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return;
  const items = await tx
    .select({ i: orderItems, months: products.warrantyMonths })
    .from(orderItems)
    .leftJoin(products, eq(products.slug, orderItems.productSlug))
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.id));
  const existing = await tx.select().from(warranties).where(eq(warranties.orderId, orderId));
  const from = start ?? new Date();
  for (const { i, months } of items) {
    const m = months ?? 12;
    if (m <= 0) continue;
    const have = existing.filter((w) => w.orderItemId === i.id).length;
    for (let n = have; n < i.quantity; n++) {
      await tx.insert(warranties).values({
        code: randomToken(8),
        orderId,
        orderItemId: i.id,
        productName: i.name,
        variantLabel: i.variantLabel,
        months: m,
        startsAt: from,
        endsAt: addMonths(from, m),
        customerName: `${o.firstName} ${o.lastName}`.trim(),
        phone: o.phone,
        storeId: o.storeId,
      });
    }
  }
  if (start) {
    const rows = await tx.select().from(warranties).where(eq(warranties.orderId, orderId));
    for (const w of rows) await tx.update(warranties).set({ startsAt: start, endsAt: addMonths(start, w.months), voided: false }).where(eq(warranties.id, w.id));
  }
}

/** A cancelled order's warranties stop counting (they come back if the order is reactivated). */
export async function voidWarranties(tx: Tx, orderId: number, voided: boolean) {
  await tx.update(warranties).set({ voided }).where(eq(warranties.orderId, orderId));
}

/** Stores the IMEI / serial numbers of an order line, one per unit, creating the warranty rows if needed. */
export async function setSerials(orderId: number, orderItemId: number, serials: string[]) {
  await db.transaction(async (tx) => {
    await issueWarranties(tx, orderId);
    const rows = await tx
      .select()
      .from(warranties)
      .where(and(eq(warranties.orderId, orderId), eq(warranties.orderItemId, orderItemId)))
      .orderBy(asc(warranties.id));
    for (const [k, w] of rows.entries()) {
      await tx.update(warranties).set({ serial: (serials[k] ?? "").trim().toUpperCase().slice(0, 40) }).where(eq(warranties.id, w.id));
    }
  });
}

/** Warranty rows of some orders, grouped by order line. */
export async function warrantiesFor(orderIds: number[]) {
  if (!orderIds.length) return new Map<number, (typeof warranties.$inferSelect)[]>();
  const rows = await db.select().from(warranties).where(inArray(warranties.orderId, orderIds)).orderBy(asc(warranties.id));
  const map = new Map<number, (typeof warranties.$inferSelect)[]>();
  for (const w of rows) {
    const k = w.orderItemId ?? 0;
    map.set(k, [...(map.get(k) ?? []), w]);
  }
  return map;
}
