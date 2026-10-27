import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";

const COOKIE = "ps_customer";
const MAX_AGE = 60 * 60 * 24 * 60;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set (16+ chars)");
  return new TextEncoder().encode(`customer:${s}`);
}

export async function signInCustomer(id: number) {
  const token = await new SignJWT({ cid: id }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

export async function signOutCustomer() {
  (await cookies()).delete(COOKIE);
}

export async function getCustomerId(): Promise<number | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = Number(payload.cid);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export async function getCustomer() {
  const id = await getCustomerId();
  if (!id) return null;
  const [c] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return c ?? null;
}
