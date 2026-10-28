"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { allowAll, clientIp } from "@/lib/rate-limit";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(120));

export async function subscribeNewsletter(email: string, locale: string): Promise<{ ok: true } | { ok: false; error: "invalid" | "rate" }> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "invalid" };
  if (!(await allowAll([[`newsletter:ip:${await clientIp()}`, 5, 3600]]))) return { ok: false, error: "rate" };
  // Already subscribed reads as success, so the form never reveals who is on the list.
  await db
    .insert(newsletterSubscribers)
    .values({ email: parsed.data, locale: locale === "ar" ? "ar" : "fr" })
    .onConflictDoNothing({ target: newsletterSubscribers.email });
  return { ok: true };
}

/** Removes an address (unsubscribe requests arrive by e-mail). */
export async function removeSubscriber(id: number) {
  await requirePerm("customers");
  await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
  revalidatePath("/admin/newsletter");
}
