import { desc } from "drizzle-orm";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { can, getMember } from "@/lib/auth";

/** CSV of the newsletter list, for import into a mailing tool. */
export async function GET() {
  const member = await getMember();
  if (!member || !can(member.role, "customers")) return new Response("unauthorized", { status: 401 });
  const rows = await db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt));
  // Quote every field and neutralise leading formula characters so spreadsheets open it safely.
  const cell = (v: string) => `"${v.replace(/^[=+\-@]/, "'$&").replace(/"/g, '""')}"`;
  const csv = ["email,locale,created_at", ...rows.map((r) => [r.email, r.locale, r.createdAt.toISOString()].map(cell).join(","))].join("\r\n");
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
