import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { staff, type StaffRole } from "@/db/schema";

const COOKIE = "ps_admin";
const MAX_AGE = 60 * 60 * 24 * 7;

/** "owner" is the shop owner (ADMIN_PASSWORD); the others are team accounts. */
export type Role = "owner" | StaffRole;
export type Member = { id: number | null; name: string; role: Role };

export const ROLE_LABELS: Record<Role, string> = {
  owner: "المالك",
  orders: "مسؤول الطلبات",
  catalog: "مسؤول المنتجات والمخزون",
  driver: "موصّل",
};

const PERMS = {
  dashboard: ["owner", "orders", "catalog"],
  orders: ["owner", "orders"],
  customers: ["owner", "orders"],
  catalog: ["owner", "catalog"],
  coupons: ["owner"],
  team: ["owner"],
  stats: ["owner"],
  deliveries: ["driver"],
} as const satisfies Record<string, readonly Role[]>;
export type Perm = keyof typeof PERMS;

export const can = (role: Role, perm: Perm) => (PERMS[perm] as readonly Role[]).includes(role);

/** Where each role lands after signing in. */
export const homeFor = (role: Role) => (role === "driver" ? "/admin/deliveries" : "/admin");

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET must be set (16+ chars)");
  return new TextEncoder().encode(s);
}

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** `version` is the staff account's session version (0 for the owner); a password change bumps it. */
export async function createSession(sid: number | null, version = 0) {
  const token = await new SignJWT({ sid: sid ?? 0, sv: version })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in team member. Team accounts are re-read each time so a deactivated account loses access at once. */
export async function getMember(): Promise<Member | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const sid = Number(payload.sid ?? 0);
    if (!sid) return { id: null, name: "المالك", role: "owner" };
    const [row] = await db
      .select({ id: staff.id, name: staff.name, role: staff.role, active: staff.active, sessionVersion: staff.sessionVersion })
      .from(staff)
      .where(eq(staff.id, sid))
      .limit(1);
    return row?.active && row.sessionVersion === Number(payload.sv ?? 0) ? { id: row.id, name: row.name, role: row.role } : null;
  } catch {
    return null;
  }
}

/** Call at the top of every admin page, server action and route handler. */
export async function requirePerm(perm: Perm): Promise<Member> {
  const m = await getMember();
  if (!m) redirect("/admin/login");
  if (!can(m.role, perm)) redirect(homeFor(m.role));
  return m;
}
