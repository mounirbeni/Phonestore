import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";

export function customerOrders(customerId: number, limit = 50) {
  return db
    .select({
      number: orders.number,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      items: sql<number>`(select coalesce(sum(oi.quantity), 0)::int from order_items oi where oi.order_id = "orders"."id")`,
    })
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}
