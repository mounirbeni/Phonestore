"use server";

import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { staff, supportTickets, TICKET_STATUSES, TICKET_TYPES, ticketMessages, type TicketStatus } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { getCustomerId } from "@/lib/customer-auth";
import { allowAll, clientIp } from "@/lib/rate-limit";
import { sendTicketCreated, sendTicketReply } from "@/lib/mail";
import { randomToken } from "@/lib/utils";

const ticketSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email().max(120)),
  phone: z.string().trim().max(30).default(""),
  type: z.enum(TICKET_TYPES),
  orderNumber: z.string().trim().toUpperCase().max(20).default(""),
  subject: z.string().trim().min(3).max(140),
  message: z.string().trim().min(10).max(5000),
  locale: z.enum(["fr", "ar"]).default("fr"),
});

export type TicketInput = z.input<typeof ticketSchema>;

/* ---------- customers ---------- */

/** A message sent from the contact page; complaints and returns start at high priority. */
export async function createTicket(input: TicketInput): Promise<{ ok: true; number: string; token: string } | { ok: false; error: "invalid" | "rate" | "server"; fields?: string[] }> {
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fields: [...new Set(parsed.error.issues.map((i) => String(i.path[0])))] };
  const t = parsed.data;
  if (!(await allowAll([[`ticket:ip:${await clientIp()}`, 5, 3600], [`ticket:email:${t.email}`, 3, 3600]]))) return { ok: false, error: "rate" };
  const customerId = await getCustomerId();
  try {
    const ticket = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(supportTickets)
        .values({
          token: randomToken(12),
          type: t.type,
          priority: t.type === "complaint" || t.type === "return" ? "high" : "normal",
          name: t.name,
          email: t.email,
          phone: t.phone,
          orderNumber: t.orderNumber.replace(/^#/, ""),
          subject: t.subject,
          locale: t.locale,
          customerId,
        })
        .returning();
      const [done] = await tx.update(supportTickets).set({ number: `TK-${1000 + row.id}` }).where(eq(supportTickets.id, row.id)).returning();
      await tx.insert(ticketMessages).values({ ticketId: row.id, author: "customer", by: t.name, body: t.message });
      return done;
    });
    after(() => sendTicketCreated(ticket, t.message));
    return { ok: true, number: ticket.number, token: ticket.token };
  } catch (e) {
    console.error("createTicket failed", e);
    return { ok: false, error: "server" };
  }
}

/** The customer answers from their private ticket page; a solved ticket opens again. */
export async function customerReply(number: string, token: string, body: string): Promise<{ ok: boolean; error?: "invalid" | "rate" | "closed" }> {
  const text = typeof body === "string" ? body.trim().slice(0, 5000) : "";
  if (text.length < 2 || typeof number !== "string" || typeof token !== "string") return { ok: false, error: "invalid" };
  if (!(await allowAll([[`ticket-reply:ip:${await clientIp()}`, 20, 3600]]))) return { ok: false, error: "rate" };
  const [t] = await db.select().from(supportTickets).where(and(eq(supportTickets.number, number), eq(supportTickets.token, token))).limit(1);
  if (!t) return { ok: false, error: "invalid" };
  if (t.status === "closed") return { ok: false, error: "closed" };
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(ticketMessages).values({ ticketId: t.id, author: "customer", by: t.name, body: text });
    await tx.update(supportTickets).set({ status: t.status === "new" ? "new" : "open", lastCustomerAt: now, updatedAt: now }).where(eq(supportTickets.id, t.id));
  });
  revalidatePath(`/${t.locale}/support/${t.number}`);
  return { ok: true };
}

/* ---------- support team ---------- */

/** Answers the customer (status "waiting for the customer") or leaves an internal note for the team. */
export async function staffReply(ticketId: number, body: string, internal: boolean): Promise<{ ok: boolean; error?: string }> {
  const me = await requirePerm("support");
  const text = typeof body === "string" ? body.trim().slice(0, 5000) : "";
  if (text.length < 2) return { ok: false, error: "اكتب الرسالة" };
  const [t] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  if (!t) return { ok: false, error: "التذكرة غير موجودة" };
  await db.transaction(async (tx) => {
    await tx.insert(ticketMessages).values({ ticketId, author: internal ? "note" : "staff", staffId: me.id, by: me.name, body: text });
    const status: TicketStatus = internal ? (t.status === "new" ? "open" : t.status) : t.status === "closed" ? "closed" : "waiting";
    // Whoever answers an unassigned ticket takes it.
    await tx.update(supportTickets).set({ status, updatedAt: new Date(), assigneeId: t.assigneeId ?? me.id }).where(eq(supportTickets.id, ticketId));
  });
  if (!internal) after(() => sendTicketReply(t, text));
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const STATUS_NOTE: Record<TicketStatus, string> = { new: "جديدة", open: "قيد المعالجة", waiting: "بانتظار رد العميل", resolved: "تم الحل", closed: "مغلقة" };

/** Status, priority or assignee change, logged in the conversation for the team. */
export async function updateTicket(ticketId: number, patch: { status?: TicketStatus; priority?: "normal" | "high"; assigneeId?: number | null }): Promise<{ ok: boolean; error?: string }> {
  const me = await requirePerm("support");
  const [t] = await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1);
  if (!t) return { ok: false, error: "التذكرة غير موجودة" };
  const set: Partial<typeof supportTickets.$inferInsert> = {};
  const notes: string[] = [];
  if (patch.status && TICKET_STATUSES.includes(patch.status) && patch.status !== t.status) {
    set.status = patch.status;
    notes.push(`الحالة: ${STATUS_NOTE[patch.status]}`);
  }
  if (patch.priority && (patch.priority === "normal" || patch.priority === "high") && patch.priority !== t.priority) {
    set.priority = patch.priority;
    notes.push(patch.priority === "high" ? "أولوية عالية" : "أولوية عادية");
  }
  if (patch.assigneeId !== undefined && patch.assigneeId !== t.assigneeId) {
    if (patch.assigneeId != null) {
      const [m] = await db.select().from(staff).where(and(eq(staff.id, patch.assigneeId), eq(staff.active, true), inArray(staff.role, ["support", "orders"]))).limit(1);
      if (!m) return { ok: false, error: "العضو غير موجود أو غير مفعّل" };
      notes.push(`أُسندت إلى ${m.name}`);
    } else notes.push("أُلغي الإسناد");
    set.assigneeId = patch.assigneeId;
  }
  if (!notes.length) return { ok: true };
  await db.transaction(async (tx) => {
    await tx.update(supportTickets).set({ ...set, updatedAt: new Date() }).where(eq(supportTickets.id, ticketId));
    for (const n of notes) await tx.insert(ticketMessages).values({ ticketId, author: "event", staffId: me.id, by: me.name, body: n });
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
