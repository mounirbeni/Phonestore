import "server-only";
import { and, eq, gt, gte, ilike, isNull, lt, or, type SQL } from "drizzle-orm";
import { ORDER_STATUSES, orders, type OrderStatus } from "@/db/schema";

/** "deposit" is a view, not a status: pending orders whose advance has not arrived yet. */
export type OrderView = OrderStatus | "deposit";

export type OrderFilter = { view?: OrderView; q?: string; from?: string; to?: string };

const day = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined);

/** Reads the list's query string (also used by the CSV export, so both show the same orders). */
export function parseOrderFilter(sp: Record<string, string | undefined>): OrderFilter {
  const v = sp.status;
  return {
    view: v === "deposit" || ORDER_STATUSES.includes(v as OrderStatus) ? (v as OrderView) : undefined,
    q: sp.q?.trim().slice(0, 60) || undefined,
    from: day(sp.from),
    to: day(sp.to),
  };
}

export function orderWhere(f: OrderFilter, { ignoreView = false } = {}) {
  const conds: (SQL | undefined)[] = [];
  if (!ignoreView && f.view === "deposit") conds.push(eq(orders.status, "pending"), gt(orders.deposit, 0), isNull(orders.depositPaidAt));
  else if (!ignoreView && f.view) conds.push(eq(orders.status, f.view as OrderStatus));
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, "\\$&")}%`;
    conds.push(or(ilike(orders.number, like), ilike(orders.email, like), ilike(orders.firstName, like), ilike(orders.lastName, like), ilike(orders.phone, like), ilike(orders.city, like)));
  }
  if (f.from) conds.push(gte(orders.createdAt, new Date(`${f.from}T00:00:00`)));
  if (f.to) {
    const end = new Date(`${f.to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    conds.push(lt(orders.createdAt, end));
  }
  return and(...conds);
}

/** Query string for a filter, e.g. for pagination links and the export button. */
export function orderQuery(f: OrderFilter, extra: Record<string, string> = {}) {
  const p = new URLSearchParams();
  if (f.view) p.set("status", f.view);
  if (f.q) p.set("q", f.q);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}
