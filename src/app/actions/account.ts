"use server";

import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { addresses, customers, wishlistItems } from "@/db/schema";
import { countryCodes } from "@/config/store";
import { getCustomerId, signInCustomer, signOutCustomer } from "@/lib/customer-auth";
import { isLocale, localePath, type Locale } from "@/lib/i18n";
import { failDelay, hashPassword, verifyPassword } from "@/lib/password";

type FormState = { error?: string; ok?: boolean } | undefined;

const email = z.string().trim().toLowerCase().email().max(120);
const password = z.string().min(8).max(100);
const name = z.string().trim().min(1).max(60);
const phone = z.string().trim().min(6).max(30);

const locOf = (f: FormData): Locale => {
  const l = String(f.get("locale") ?? "fr");
  return isLocale(l) ? l : "fr";
};

/** Only same-site paths are followed after signing in. */
const safeNext = (f: FormData, locale: Locale) => {
  const n = String(f.get("next") ?? "");
  return n.startsWith(`/${locale}/`) && !n.startsWith("//") ? n : localePath(locale, "/account");
};

export async function register(_prev: FormState, f: FormData): Promise<FormState> {
  const locale = locOf(f);
  const parsed = z
    .object({ email, password, firstName: name, lastName: name, phone })
    .safeParse(Object.fromEntries(["email", "password", "firstName", "lastName", "phone"].map((k) => [k, String(f.get(k) ?? "")])));
  if (!parsed.success) return { error: String(parsed.error.issues[0]?.path[0] ?? "form") };
  const v = parsed.data;
  const [exists] = await db.select({ id: customers.id }).from(customers).where(eq(customers.email, v.email)).limit(1);
  if (exists) return { error: "taken" };
  const [c] = await db
    .insert(customers)
    .values({ email: v.email, passwordHash: await hashPassword(v.password), firstName: v.firstName, lastName: v.lastName, phone: v.phone })
    .returning({ id: customers.id });
  await signInCustomer(c.id);
  redirect(safeNext(f, locale));
}

export async function signIn(_prev: FormState, f: FormData): Promise<FormState> {
  const locale = locOf(f);
  const e = email.safeParse(String(f.get("email") ?? ""));
  const pw = String(f.get("password") ?? "");
  const [c] = e.success ? await db.select().from(customers).where(eq(customers.email, e.data)).limit(1) : [];
  if (!c || !(await verifyPassword(pw, c.passwordHash))) {
    await failDelay();
    return { error: "credentials" };
  }
  await signInCustomer(c.id);
  redirect(safeNext(f, locale));
}

export async function signOut(locale: Locale) {
  await signOutCustomer();
  redirect(localePath(isLocale(locale) ? locale : "fr", "/account/login"));
}

async function me() {
  const id = await getCustomerId();
  if (!id) throw new Error("signed out");
  return id;
}

export async function updateProfile(_prev: FormState, f: FormData): Promise<FormState> {
  const id = await me();
  const parsed = z.object({ firstName: name, lastName: name, phone }).safeParse({
    firstName: String(f.get("firstName") ?? ""),
    lastName: String(f.get("lastName") ?? ""),
    phone: String(f.get("phone") ?? ""),
  });
  if (!parsed.success) return { error: String(parsed.error.issues[0]?.path[0] ?? "form") };
  await db.update(customers).set(parsed.data).where(eq(customers.id, id));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePassword(_prev: FormState, f: FormData): Promise<FormState> {
  const id = await me();
  const next = password.safeParse(String(f.get("next") ?? ""));
  if (!next.success) return { error: "password" };
  const [c] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!c || !(await verifyPassword(String(f.get("current") ?? ""), c.passwordHash))) {
    await failDelay();
    return { error: "current" };
  }
  await db.update(customers).set({ passwordHash: await hashPassword(next.data) }).where(eq(customers.id, id));
  return { ok: true };
}

const addressSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  firstName: name,
  lastName: name,
  phone,
  address: z.string().trim().min(3).max(160),
  address2: z.string().trim().max(160).default(""),
  city: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().max(12).default(""),
  country: z.enum(countryCodes),
  isDefault: z.boolean().default(false),
});

export async function saveAddress(_prev: FormState, f: FormData): Promise<FormState> {
  const customerId = await me();
  const raw = Object.fromEntries(["id", "firstName", "lastName", "phone", "address", "address2", "city", "postalCode", "country"].map((k) => [k, String(f.get(k) ?? "")]));
  const parsed = addressSchema.safeParse({ ...raw, id: raw.id || undefined, isDefault: f.get("isDefault") === "on" });
  if (!parsed.success) return { error: String(parsed.error.issues[0]?.path[0] ?? "form") };
  const { id, ...v } = parsed.data;
  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.customerId, customerId));
    const isDefault = v.isDefault || existing.length === 0 || (existing.length === 1 && existing[0].id === id);
    if (isDefault) await tx.update(addresses).set({ isDefault: false }).where(eq(addresses.customerId, customerId));
    if (id) await tx.update(addresses).set({ ...v, isDefault }).where(and(eq(addresses.id, id), eq(addresses.customerId, customerId)));
    else await tx.insert(addresses).values({ ...v, isDefault, customerId });
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAddress(id: number) {
  const customerId = await me();
  await db.transaction(async (tx) => {
    const [gone] = await tx.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.customerId, customerId))).returning();
    if (gone?.isDefault) {
      const [next] = await tx.select({ id: addresses.id }).from(addresses).where(eq(addresses.customerId, customerId)).orderBy(asc(addresses.createdAt)).limit(1);
      if (next) await tx.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
    }
  });
  revalidatePath("/", "layout");
}

export async function makeDefaultAddress(id: number) {
  const customerId = await me();
  await db.transaction(async (tx) => {
    await tx.update(addresses).set({ isDefault: false }).where(and(eq(addresses.customerId, customerId), ne(addresses.id, id)));
    await tx.update(addresses).set({ isDefault: true }).where(and(eq(addresses.id, id), eq(addresses.customerId, customerId)));
  });
  revalidatePath("/", "layout");
}

/* ---------- wishlist ---------- */

const cleanSlugs = (slugs: unknown) =>
  Array.isArray(slugs) ? [...new Set(slugs.filter((s): s is string => typeof s === "string" && /^[a-z0-9-]{1,90}$/.test(s)))].slice(0, 200) : [];

/** Signed in: merges this device's favourites into the account and returns the full list. Signed out: null. */
export async function syncWishlist(local: string[]): Promise<string[] | null> {
  const customerId = await getCustomerId();
  if (!customerId) return null;
  const add = cleanSlugs(local);
  if (add.length) await db.insert(wishlistItems).values(add.map((productSlug) => ({ customerId, productSlug }))).onConflictDoNothing();
  const rows = await db.select({ slug: wishlistItems.productSlug }).from(wishlistItems).where(eq(wishlistItems.customerId, customerId)).orderBy(asc(wishlistItems.createdAt));
  return rows.map((r) => r.slug).reverse();
}

/** Replaces the account's favourites with the list shown on the device. */
export async function saveWishlist(slugs: string[]) {
  const customerId = await getCustomerId();
  if (!customerId) return;
  const keep = cleanSlugs(slugs);
  await db.transaction(async (tx) => {
    const current = await tx.select({ slug: wishlistItems.productSlug }).from(wishlistItems).where(eq(wishlistItems.customerId, customerId));
    const drop = current.map((r) => r.slug).filter((s) => !keep.includes(s));
    if (drop.length) await tx.delete(wishlistItems).where(and(eq(wishlistItems.customerId, customerId), inArray(wishlistItems.productSlug, drop)));
    const add = keep.filter((s) => !current.some((r) => r.slug === s));
    if (add.length) await tx.insert(wishlistItems).values(add.map((productSlug) => ({ customerId, productSlug }))).onConflictDoNothing();
  });
}
