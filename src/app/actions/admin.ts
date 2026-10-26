"use server";

import { and, count, eq, inArray, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { categories, coupons, ORDER_STATUSES, orderItems, orders, products, variants, type OrderStatus, type Spec } from "@/db/schema";
import { checkPassword, createSession, destroySession, requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const refresh = () => revalidatePath("/admin", "layout");

/* ---------- auth ---------- */

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const ok = checkPassword(String(formData.get("password") ?? ""));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // slow down brute-force attempts
    return { error: "كلمة المرور غير صحيحة" };
  }
  await createSession();
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------- orders ---------- */

export async function updateOrderStatus(orderId: number, status: OrderStatus): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!ORDER_STATUSES.includes(status)) return { ok: false, error: "حالة غير صالحة" };
  try {
    await db.transaction(async (tx) => {
      const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
      if (!o || o.status === status) return;
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      const stocked = items.filter((i) => i.variantId != null);
      if (o.status !== "cancelled" && status === "cancelled") {
        for (const i of stocked) {
          await tx.update(variants).set({ stock: sql`${variants.stock} + ${i.quantity}` }).where(eq(variants.id, i.variantId!));
        }
      } else if (o.status === "cancelled" && status !== "cancelled") {
        for (const i of stocked) {
          const upd = await tx
            .update(variants)
            .set({ stock: sql`${variants.stock} - ${i.quantity}` })
            .where(and(eq(variants.id, i.variantId!), sql`${variants.stock} >= ${i.quantity}`))
            .returning({ id: variants.id });
          if (!upd.length) throw new Error("STOCK");
        }
      }
      await tx.update(orders).set({ status }).where(eq(orders.id, orderId));
    });
  } catch (e) {
    if (e instanceof Error && e.message === "STOCK") return { ok: false, error: "المخزون غير كافٍ لإعادة تفعيل هذا الطلب" };
    throw e;
  }
  refresh();
  return { ok: true };
}

export async function saveAdminNote(orderId: number, note: string) {
  await requireAdmin();
  await db.update(orders).set({ adminNote: note.slice(0, 2000) }).where(eq(orders.id, orderId));
  refresh();
}

/* ---------- products ---------- */

const variantSchema = z.object({
  id: z.number().int().positive().optional(),
  sku: z.string().trim().max(40).default(""),
  colorFr: z.string().trim().max(40).default(""),
  colorAr: z.string().trim().max(40).default(""),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1c1c1e"),
  storage: z.string().trim().max(20).default(""),
  price: z.number().min(0).max(100000),
  compareAt: z.number().min(0).max(100000).nullable(),
  stock: z.number().int().min(0).max(1000000),
});

const productSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(100).default(""),
  brand: z.string().trim().min(1).max(40),
  categoryId: z.number().int().positive(),
  shortFr: z.string().trim().max(300).default(""),
  shortAr: z.string().trim().max(300).default(""),
  descFr: z.string().trim().max(4000).default(""),
  descAr: z.string().trim().max(4000).default(""),
  images: z.array(z.string().trim().max(500).regex(/^(https?:\/\/|\/)/)).max(10),
  specsText: z.string().max(4000).default(""),
  featured: z.boolean(),
  isNew: z.boolean(),
  active: z.boolean(),
  warrantyMonths: z.number().int().min(0).max(120),
  variants: z.array(variantSchema).min(1).max(40),
});

export type ProductPayload = z.input<typeof productSchema>;

function parseSpecs(text: string): Spec[] {
  return text
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p) => p.length >= 2 && p[0] && p[p.length - 1])
    .map((p) => (p.length === 2 ? { fr: p[0], ar: p[0], value: p[1] } : { fr: p[0], ar: p[1] || p[0], value: p.slice(2).join(" | ") }))
    .slice(0, 40);
}

export async function saveProduct(input: ProductPayload): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `بيانات غير صالحة: ${issue.path.join(".")}` };
  }
  const p = parsed.data;

  const base = slugify(p.slug || p.name) || "produit";
  let slug = base;
  for (let n = 2; ; n++) {
    const [clash] = await db
      .select({ id: products.id })
      .from(products)
      .where(p.id ? and(eq(products.slug, slug), ne(products.id, p.id)) : eq(products.slug, slug))
      .limit(1);
    if (!clash) break;
    slug = `${base}-${n}`;
  }

  try {
    const id = await db.transaction(async (tx) => {
      const values = {
        slug,
        name: p.name,
        brand: p.brand,
        categoryId: p.categoryId,
        shortFr: p.shortFr,
        shortAr: p.shortAr,
        descFr: p.descFr,
        descAr: p.descAr,
        images: p.images,
        specs: parseSpecs(p.specsText),
        featured: p.featured,
        isNew: p.isNew,
        active: p.active,
        warrantyMonths: p.warrantyMonths,
      };
      let productId = p.id;
      if (productId) {
        await tx.update(products).set(values).where(eq(products.id, productId));
      } else {
        const [row] = await tx.insert(products).values(values).returning({ id: products.id });
        productId = row.id;
      }

      const existing = await tx.select({ id: variants.id }).from(variants).where(eq(variants.productId, productId));
      const keep = new Set(p.variants.map((v) => v.id).filter((x): x is number => !!x && existing.some((e) => e.id === x)));
      const drop = existing.map((e) => e.id).filter((x) => !keep.has(x));
      if (drop.length) await tx.delete(variants).where(inArray(variants.id, drop));

      for (const [i, v] of p.variants.entries()) {
        const row = {
          productId,
          sku: v.sku || `ES-${Date.now().toString(36).toUpperCase()}${i}`,
          colorFr: v.colorFr,
          colorAr: v.colorAr,
          colorHex: v.colorHex,
          storage: v.storage,
          price: Math.round(v.price * 100),
          compareAtPrice: v.compareAt ? Math.round(v.compareAt * 100) : null,
          stock: v.stock,
          sort: i,
        };
        if (v.id && keep.has(v.id)) await tx.update(variants).set(row).where(eq(variants.id, v.id));
        else await tx.insert(variants).values(row);
      }
      return productId;
    });
    refresh();
    return { ok: true, id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/variants_sku_unique|duplicate key/i.test(msg + String((e as { cause?: unknown })?.cause ?? ""))) {
      return { ok: false, error: "رمز SKU مستخدم مسبقًا في منتج آخر" };
    }
    console.error("saveProduct failed", e);
    return { ok: false, error: "تعذّر حفظ المنتج" };
  }
}

export async function setProductActive(id: number, active: boolean) {
  await requireAdmin();
  await db.update(products).set({ active }).where(eq(products.id, id));
  refresh();
}

export async function deleteProduct(id: number) {
  await requireAdmin();
  await db.delete(products).where(eq(products.id, id));
  refresh();
}

/* ---------- categories ---------- */

const categorySchema = z.object({
  id: z.number().int().positive().optional(),
  nameFr: z.string().trim().min(1).max(60),
  nameAr: z.string().trim().min(1).max(60),
  slug: z.string().trim().max(60).default(""),
  icon: z.enum(["phone", "tablet", "watch", "audio", "laptop", "accessory", "scooter", "tv", "home"]),
  sort: z.number().int().min(0).max(999),
});

export async function saveCategory(input: z.input<typeof categorySchema>): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة" };
  const c = parsed.data;
  const slug = slugify(c.slug || c.nameFr);
  if (!slug) return { ok: false, error: "معرّف الرابط غير صالح" };
  try {
    if (c.id) await db.update(categories).set({ nameFr: c.nameFr, nameAr: c.nameAr, slug, icon: c.icon, sort: c.sort }).where(eq(categories.id, c.id));
    else await db.insert(categories).values({ nameFr: c.nameFr, nameAr: c.nameAr, slug, icon: c.icon, sort: c.sort });
  } catch {
    return { ok: false, error: "معرّف الرابط مستخدم مسبقًا" };
  }
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: number): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const [{ n }] = await db.select({ n: count() }).from(products).where(eq(products.categoryId, id));
  if (n > 0) return { ok: false, error: "لا يمكن حذف فئة تحتوي على منتجات" };
  await db.delete(categories).where(eq(categories.id, id));
  refresh();
  return { ok: true };
}

/* ---------- coupons ---------- */

const couponSchema = z
  .object({
    code: z.string().trim().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/),
    kind: z.enum(["percent", "amount"]),
    value: z.number().positive().max(100000),
    minSubtotal: z.number().min(0).max(100000),
    maxUses: z.number().int().positive().nullable(),
  })
  .refine((c) => c.kind !== "percent" || c.value <= 100);

export async function saveCoupon(input: z.input<typeof couponSchema>): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة (النسبة بين 1 و100)" };
  const c = parsed.data;
  try {
    await db.insert(coupons).values({
      code: c.code.toUpperCase(),
      percent: c.kind === "percent" ? Math.round(c.value) : null,
      amountOff: c.kind === "amount" ? Math.round(c.value * 100) : null,
      minSubtotal: Math.round(c.minSubtotal * 100),
      maxUses: c.maxUses,
    });
  } catch {
    return { ok: false, error: "هذا الرمز موجود مسبقًا" };
  }
  refresh();
  return { ok: true };
}

export async function setCouponActive(id: number, active: boolean) {
  await requireAdmin();
  await db.update(coupons).set({ active }).where(eq(coupons.id, id));
  refresh();
}

export async function deleteCoupon(id: number) {
  await requireAdmin();
  await db.delete(coupons).where(eq(coupons.id, id));
  refresh();
}
