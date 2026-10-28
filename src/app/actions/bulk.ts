"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { variants, variantStock } from "@/db/schema";
import { activeStores, setStoreQty } from "@/lib/stock";
import { requirePerm } from "@/lib/auth";

/** Prices in cents; `stocks` = quantity per shop (only the shops that changed). */
export type VariantChange = { id: number; price: number; compareAt: number | null; stocks: { storeId: number; qty: number }[] };

const valid = (c: VariantChange) =>
  Number.isInteger(c.id) && c.id > 0 &&
  Number.isInteger(c.price) && c.price >= 0 && c.price <= 100_000_000 &&
  (c.compareAt == null || (Number.isInteger(c.compareAt) && c.compareAt >= 0 && c.compareAt <= 100_000_000)) &&
  Array.isArray(c.stocks) && c.stocks.every((x) => Number.isInteger(x.storeId) && x.storeId > 0 && Number.isInteger(x.qty) && x.qty >= 0 && x.qty <= 1_000_000);

async function apply(changes: VariantChange[]) {
  await db.transaction(async (tx) => {
    for (const c of changes) {
      // A strike-through price only makes sense above the selling price.
      const compareAt = c.compareAt != null && c.compareAt > c.price ? c.compareAt : null;
      await tx.update(variants).set({ price: c.price, compareAtPrice: compareAt }).where(eq(variants.id, c.id));
      for (const x of c.stocks) await setStoreQty(tx, c.id, x.storeId, x.qty);
    }
  });
  revalidatePath("/admin", "layout");
}

/** Saves the rows edited in the stock & price table (prices in cents). */
export async function saveVariantsBulk(changes: VariantChange[]): Promise<{ ok: boolean; updated?: number; error?: string }> {
  await requirePerm("catalog");
  if (!Array.isArray(changes) || changes.length === 0) return { ok: true, updated: 0 };
  if (changes.length > 500 || !changes.every(valid)) return { ok: false, error: "بيانات غير صالحة" };
  await apply(changes);
  return { ok: true, updated: changes.length };
}

const toCents = (s: string | undefined) => {
  const v = (s ?? "").replace(/\s/g, "").replace(",", ".");
  if (v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

/** Splits one CSV line on `sep`, honouring double-quoted fields. */
function splitLine(line: string, sep: string) {
  const out: string[] = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^'(?=[=+\-@])/, ""));
}

/**
 * Imports the file exported from the stock & price page (edited in Excel): rows are matched by variant id,
 * else by SKU; empty price/stock cells keep the current value.
 */
export async function importVariantsCsv(text: string): Promise<{ ok: boolean; updated?: number; skipped?: number; error?: string }> {
  await requirePerm("catalog");
  if (typeof text !== "string" || text.length > 2_000_000) return { ok: false, error: "الملف كبير جدًا" };
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { ok: false, error: "الملف فارغ" };
  const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const head = splitLine(lines[0], sep).map((h) => h.toLowerCase());
  const col = (...names: string[]) => head.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));
  const iId = col("id"), iSku = col("sku"), iPrice = col("prix (", "prix", "price", "السعر"), iCompare = col("prix barré", "compare", "قبل");
  // "stock <shop code>" per shop; a plain "stock" column means the main shop.
  const shops = await activeStores();
  const stockCols = shops
    .map((st, k) => ({ storeId: st.id, i: head.findIndex((h) => h === `stock ${st.code}` || (k === 0 && h === "stock")) }))
    .filter((c) => c.i >= 0);
  if (iId < 0 && iSku < 0) return { ok: false, error: "عمود id أو sku غير موجود" };
  if (iPrice < 0 && !stockCols.length) return { ok: false, error: "عمود السعر أو المخزون غير موجود" };
  const rows = lines.slice(1, 5001).map((l) => splitLine(l, sep));

  const ids = rows.map((r) => Number(r[iId])).filter((n) => Number.isInteger(n) && n > 0);
  const skus = iSku >= 0 ? rows.map((r) => r[iSku]).filter(Boolean) : [];
  const current = [
    ...(ids.length ? await db.select().from(variants).where(inArray(variants.id, ids)) : []),
    ...(skus.length ? await db.select().from(variants).where(inArray(variants.sku, skus)) : []),
  ];
  const byId = new Map(current.map((v) => [v.id, v]));
  const bySku = new Map(current.map((v) => [v.sku, v]));
  const have = current.length ? await db.select().from(variantStock).where(inArray(variantStock.variantId, current.map((v) => v.id))) : [];
  const qtyOf = (variantId: number, storeId: number) => have.find((h) => h.variantId === variantId && h.storeId === storeId)?.qty ?? 0;

  const changes = new Map<number, VariantChange>();
  let skipped = 0;
  for (const r of rows) {
    const v = byId.get(Number(r[iId])) ?? (iSku >= 0 ? bySku.get(r[iSku]) : undefined);
    const price = iPrice >= 0 ? toCents(r[iPrice]) : undefined;
    const compare = iCompare >= 0 ? toCents(r[iCompare]) : undefined;
    const stocks = stockCols.map((c) => ({ storeId: c.storeId, raw: (r[c.i] ?? "").trim() })).filter((x) => x.raw !== "").map((x) => ({ storeId: x.storeId, qty: Number(x.raw) }));
    if (!v || Number.isNaN(price) || Number.isNaN(compare) || stocks.some((x) => !Number.isInteger(x.qty))) { skipped++; continue; }
    const next: VariantChange = {
      id: v.id,
      price: price ?? v.price,
      compareAt: iCompare >= 0 ? (compare ?? null) : v.compareAtPrice,
      stocks: stocks.filter((x) => x.qty !== qtyOf(v.id, x.storeId)),
    };
    if (!valid(next)) { skipped++; continue; }
    if (next.price !== v.price || next.stocks.length || (next.compareAt ?? null) !== (v.compareAtPrice ?? null)) changes.set(v.id, next);
  }
  if (changes.size) await apply([...changes.values()]);
  return { ok: true, updated: changes.size, skipped };
}
