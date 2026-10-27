import "server-only";
import { headers } from "next/headers";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { rateHits } from "@/db/schema";

/** The caller's IP as reported by the platform proxy (Vercel sets x-real-ip / x-forwarded-for). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/**
 * Records one attempt under `key` and reports whether it is still within `max` attempts per `windowSec`.
 * Stored in Postgres so the limit holds across serverless instances.
 */
export async function allow(key: string, max: number, windowSec: number) {
  const since = new Date(Date.now() - windowSec * 1000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(rateHits)
    .where(and(eq(rateHits.key, key), gte(rateHits.at, since)));
  if (n >= max) return false;
  await db.insert(rateHits).values({ key });
  // Opportunistic pruning keeps the table small without a cron job.
  if (Math.random() < 0.02) await db.delete(rateHits).where(lt(rateHits.at, new Date(Date.now() - 24 * 3600 * 1000)));
  return true;
}

/** True when every key is still within its limit; each key is counted. */
export async function allowAll(rules: [key: string, max: number, windowSec: number][]) {
  let ok = true;
  for (const [key, max, windowSec] of rules) if (!(await allow(key, max, windowSec))) ok = false;
  return ok;
}
