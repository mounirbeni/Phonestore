import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { stores, variants, variantStock } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Allocation = { storeId: number; qty: number };

/** Active shops, main shop first. */
export async function activeStores(tx: Tx | typeof db = db) {
  return tx.select().from(stores).where(eq(stores.active, true)).orderBy(desc(stores.isMain), asc(stores.sort), asc(stores.id));
}

/** Keeps `variants.stock` (what the website sells from) equal to the sum over shops. */
export async function syncTotal(tx: Tx, variantId: number) {
  await tx
    .update(variants)
    .set({ stock: sql`(select coalesce(sum(${variantStock.qty}), 0)::int from ${variantStock} where ${variantStock.variantId} = ${variantId})` })
    .where(eq(variants.id, variantId));
}

/** Sets a shop's quantity of a variant. */
export async function setStoreQty(tx: Tx, variantId: number, storeId: number, qty: number) {
  await tx
    .insert(variantStock)
    .values({ variantId, storeId, qty: Math.max(0, qty) })
    .onConflictDoUpdate({ target: [variantStock.variantId, variantStock.storeId], set: { qty: Math.max(0, qty) } });
  await syncTotal(tx, variantId);
}

export class StockShortError extends Error {
  constructor() {
    super("STOCK");
  }
}

/**
 * Takes `qty` units of a variant: from one shop when `storeId` is given (pickup, till sale), otherwise main shop
 * first, then the others. Returns where the units came from; throws StockShortError when there are not enough.
 */
export async function takeStock(tx: Tx, variantId: number, qty: number, storeId?: number | null): Promise<Allocation[]> {
  const rows = await tx
    .select({ storeId: variantStock.storeId, qty: variantStock.qty, isMain: stores.isMain, sort: stores.sort })
    .from(variantStock)
    .innerJoin(stores, eq(variantStock.storeId, stores.id))
    .where(and(eq(variantStock.variantId, variantId), eq(stores.active, true), storeId ? eq(variantStock.storeId, storeId) : undefined))
    .orderBy(desc(stores.isMain), asc(stores.sort), asc(stores.id))
    .for("update", { of: variantStock });
  if (rows.reduce((n, r) => n + r.qty, 0) < qty) throw new StockShortError();
  const out: Allocation[] = [];
  let left = qty;
  for (const r of rows) {
    if (!left) break;
    const n = Math.min(r.qty, left);
    if (!n) continue;
    await tx.update(variantStock).set({ qty: sql`${variantStock.qty} - ${n}` }).where(and(eq(variantStock.variantId, variantId), eq(variantStock.storeId, r.storeId)));
    out.push({ storeId: r.storeId, qty: n });
    left -= n;
  }
  await syncTotal(tx, variantId);
  return out;
}

/** Puts units back where they were taken (orders from before shops existed go back to the main shop). */
export async function returnStock(tx: Tx, variantId: number, qty: number, from: Allocation[]) {
  let alloc = from.filter((a) => a.qty > 0);
  if (!alloc.length) {
    const [main] = await activeStores(tx);
    if (!main) return;
    alloc = [{ storeId: main.id, qty }];
  }
  for (const a of alloc) {
    await tx
      .insert(variantStock)
      .values({ variantId, storeId: a.storeId, qty: a.qty })
      .onConflictDoUpdate({ target: [variantStock.variantId, variantStock.storeId], set: { qty: sql`${variantStock.qty} + ${a.qty}` } });
  }
  await syncTotal(tx, variantId);
}

/** Quantity per shop for some variants: Map<variantId, Map<storeId, qty>>. */
export async function stockByStore(variantIds: number[]) {
  const map = new Map<number, Map<number, number>>();
  if (!variantIds.length) return map;
  const rows = await db.select().from(variantStock).where(sql`${variantStock.variantId} in ${variantIds}`);
  for (const r of rows) {
    if (!map.has(r.variantId)) map.set(r.variantId, new Map());
    map.get(r.variantId)!.set(r.storeId, r.qty);
  }
  return map;
}
