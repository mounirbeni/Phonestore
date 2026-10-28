import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderEvents, orderItems, orders, type OrderStatus } from "@/db/schema";
import { returnStock, StockShortError, takeStock } from "@/lib/stock";
import { issueWarranties, voidWarranties } from "@/lib/warranty";
import type { Member } from "@/lib/auth";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Moves an order to a new status, giving stock back on cancel (and taking it again on un-cancel). */
export async function applyStatus(tx: Tx, orderId: number, status: OrderStatus, by: Member, note = "") {
  const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
  if (!o || o.status === status) return o ?? null;
  // An order is confirmed by its advance: it cannot move on to delivery until the transfer has arrived.
  if (o.deposit > 0 && !o.depositPaidAt && status !== "pending" && status !== "cancelled") throw new Error("DEPOSIT");
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const stocked = items.filter((i) => i.variantId != null);
  if (o.status !== "cancelled" && status === "cancelled") {
    for (const i of stocked) await returnStock(tx, i.variantId!, i.quantity, i.stockFrom);
    await voidWarranties(tx, orderId, true);
  } else if (o.status === "cancelled" && status !== "cancelled") {
    for (const i of stocked) {
      // Taken again from the same shop for a pickup or till sale, anywhere for a delivery.
      const from = await takeStock(tx, i.variantId!, i.quantity, o.fulfilment === "pickup" || o.channel === "store" ? o.storeId : null).catch((e) => {
        if (e instanceof StockShortError) throw new Error("STOCK");
        throw e;
      });
      await tx.update(orderItems).set({ stockFrom: from }).where(eq(orderItems.id, i.id));
    }
    await voidWarranties(tx, orderId, false);
  }
  // The warranty starts the day the customer gets the product.
  if (status === "delivered") await issueWarranties(tx, orderId, new Date());
  await tx.update(orders).set({ status }).where(eq(orders.id, orderId));
  await tx.insert(orderEvents).values({ orderId, kind: "status", status, note, staffId: by.id, by: by.name });
  return o;
}

/** Who confirms a card payment: the gateway's notification, not a person. */
export const GATEWAY: Member = { id: null, name: "الدفع الإلكتروني", role: "owner" };

/**
 * Records (or undoes) the arrival of the advance; a waiting order is then confirmed.
 * Used by the team for transfers and by the card gateway's notification (idempotent: a repeat does nothing).
 */
export async function markDeposit(orderId: number, paid: boolean, by: Member, how: { method: "transfer" | "card"; ref?: string }) {
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
    if (!o || o.deposit <= 0) return { ok: false as const, error: "none" as const };
    if (!paid && (o.status === "shipped" || o.status === "delivered")) return { ok: false as const, error: "late" as const };
    if (paid === !!o.depositPaidAt) return { ok: true as const };
    await tx
      .update(orders)
      .set(paid ? { depositPaidAt: new Date(), depositMethod: how.method, depositRef: how.ref ?? "" } : { depositPaidAt: null, depositMethod: "", depositRef: "" })
      .where(eq(orders.id, orderId));
    const note = paid ? (how.method === "card" ? `تم دفع التسبيق بالبطاقة${how.ref ? ` (${how.ref})` : ""}` : "تم استلام التسبيق بالتحويل البنكي") : "أُلغي تسجيل استلام التسبيق";
    await tx.insert(orderEvents).values({ orderId, kind: "note", note, staffId: by.id, by: by.name });
    if (paid && o.status === "pending") await applyStatus(tx, orderId, "confirmed", by);
    // A cancelled order whose card payment arrives late keeps its status; the team refunds or reactivates it.
    if (!paid && o.status === "confirmed") await applyStatus(tx, orderId, "pending", by);
    return { ok: true as const };
  });
}
