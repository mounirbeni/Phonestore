import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { GATEWAY, markDeposit } from "@/lib/order-status";
import { payzoneReady, readNotice } from "@/lib/payments/payzone";

/** Payzone's server-to-server payment notification: the only place a card payment confirms an order. */
export async function POST(req: Request) {
  if (!payzoneReady()) return NextResponse.json({ error: "not_configured" }, { status: 501 });
  const notice = await readNotice(req);
  if (!notice) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const [o] = await db.select({ id: orders.id, deposit: orders.deposit }).from(orders).where(eq(orders.number, notice.orderNumber)).limit(1);
  if (!o) return NextResponse.json({ error: "unknown_order" }, { status: 404 });
  // The amount must match the advance exactly; anything else is left for the team to check.
  if (notice.paid && notice.amount === o.deposit) {
    await markDeposit(o.id, true, GATEWAY, { method: "card", ref: notice.ref });
  } else if (notice.paid) {
    console.error("[payzone] amount mismatch", notice.orderNumber, notice.amount, o.deposit);
  }
  return NextResponse.json({ ok: true });
}
