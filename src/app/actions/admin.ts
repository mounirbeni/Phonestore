"use server";

import { and, count, eq, inArray, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  categories,
  coupons,
  ORDER_STATUSES,
  orderEvents,
  orderItems,
  orders,
  products,
  staff,
  variants,
  type OrderStatus,
  type Spec,
} from "@/db/schema";
import { checkPassword, createSession, destroySession, homeFor, requirePerm, type Member } from "@/lib/auth";
import { failDelay, verifyPassword } from "@/lib/password";
import { allowAll, clientIp } from "@/lib/rate-limit";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { slugify } from "@/lib/utils";

const refresh = () => revalidatePath("/admin", "layout");

/* ---------- auth ---------- */

/** Team members sign in with their e-mail; the owner leaves the e-mail empty and uses ADMIN_PASSWORD. */
export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!(await allowAll([[`admin:ip:${await clientIp()}`, 10, 900], [`admin:email:${email || "owner"}`, 10, 900]]))) {
    return { error: "محاولات كثيرة. انتظر 15 دقيقة ثم حاول مجددًا." };
  }
  if (!email) {
    if (!checkPassword(password)) {
      await failDelay();
      return { error: "كلمة المرور غير صحيحة" };
    }
    await createSession(null);
    redirect("/admin");
  }
  const [m] = await db.select().from(staff).where(eq(staff.email, email)).limit(1);
  if (!m || !m.active || !(await verifyPassword(password, m.passwordHash))) {
    await failDelay();
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
  }
  await db.update(staff).set({ lastLoginAt: new Date() }).where(eq(staff.id, m.id));
  await createSession(m.id, m.sessionVersion);
  redirect(homeFor(m.role));
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------- orders ---------- */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Moves an order to a new status, giving stock back on cancel (and taking it again on un-cancel). */
async function applyStatus(tx: Tx, orderId: number, status: OrderStatus, by: Member, note = "") {
  const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
  if (!o || o.status === status) return o ?? null;
  // An order is confirmed by its advance: it cannot move on to delivery until the transfer has arrived.
  if (o.deposit > 0 && !o.depositPaidAt && status !== "pending" && status !== "cancelled") throw new Error("DEPOSIT");
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
  await tx.insert(orderEvents).values({ orderId, kind: "status", status, note, staffId: by.id, by: by.name });
  return o;
}

export async function updateOrderStatus(orderId: number, status: OrderStatus): Promise<{ ok: boolean; error?: string }> {
  const me = await requirePerm("orders");
  if (!ORDER_STATUSES.includes(status)) return { ok: false, error: "حالة غير صالحة" };
  try {
    await db.transaction((tx) => applyStatus(tx, orderId, status, me));
  } catch (e) {
    if (e instanceof Error && e.message === "STOCK") return { ok: false, error: "المخزون غير كافٍ لإعادة تفعيل هذا الطلب" };
    if (e instanceof Error && e.message === "DEPOSIT") return { ok: false, error: "لم يُستلم التسبيق بعد: سجّل استلام التحويل أولًا" };
    throw e;
  }
  refresh();
  return { ok: true };
}

/** Records (or undoes) the arrival of the bank-transfer advance; a waiting order is then confirmed. */
export async function setDepositPaid(orderId: number, paid: boolean): Promise<{ ok: boolean; error?: string }> {
  const me = await requirePerm("orders");
  try {
    await db.transaction(async (tx) => {
      const [o] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
      if (!o || o.deposit <= 0) throw new Error("NONE");
      if (!paid && (o.status === "shipped" || o.status === "delivered")) throw new Error("LATE");
      if (paid === !!o.depositPaidAt) return;
      await tx.update(orders).set({ depositPaidAt: paid ? new Date() : null }).where(eq(orders.id, orderId));
      await tx.insert(orderEvents).values({ orderId, kind: "note", note: paid ? "تم استلام التسبيق بالتحويل البنكي" : "أُلغي تسجيل استلام التسبيق", staffId: me.id, by: me.name });
      if (paid && o.status === "pending") await applyStatus(tx, orderId, "confirmed", me);
      if (!paid && o.status === "confirmed") await applyStatus(tx, orderId, "pending", me);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NONE") return { ok: false, error: "هذا الطلب بدون تسبيق" };
    if (e instanceof Error && e.message === "LATE") return { ok: false, error: "الطلب في التوصيل أو مُسلَّم" };
    throw e;
  }
  refresh();
  return { ok: true };
}

export async function saveAdminNote(orderId: number, note: string) {
  await requirePerm("orders");
  await db.update(orders).set({ adminNote: note.slice(0, 2000) }).where(eq(orders.id, orderId));
  refresh();
}

/** Hands the order to a driver (or takes it back with null). */
export async function assignDriver(orderId: number, driverId: number | null): Promise<{ ok: boolean; error?: string }> {
  const me = await requirePerm("orders");
  let driverName = "";
  if (driverId != null) {
    const [d] = await db.select().from(staff).where(eq(staff.id, driverId)).limit(1);
    if (!d || d.role !== "driver" || !d.active) return { ok: false, error: "الموصّل غير موجود أو غير مفعّل" };
    driverName = d.name;
  }
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ driverId }).where(eq(orders.id, orderId));
    await tx.insert(orderEvents).values({ orderId, kind: "assign", note: driverName ? `أُسند إلى ${driverName}` : "أُلغي الإسناد", staffId: me.id, by: me.name });
  });
  refresh();
  return { ok: true };
}

/* ---------- deliveries (driver) ---------- */

/** The driver's own orders only: mark delivered, refused (back to stock), or log a note such as a failed attempt. */
export async function driverUpdate(orderId: number, action: "delivered" | "refused" | "note", note = ""): Promise<{ ok: boolean; error?: string }> {
  const me = await requirePerm("deliveries");
  const [o] = await db.select({ driverId: orders.driverId, status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o || o.driverId !== me.id) return { ok: false, error: "هذا الطلب غير مسند إليك" };
  if (o.status !== "confirmed" && o.status !== "shipped") return { ok: false, error: "لم يعد هذا الطلب قيد التوصيل" };
  const text = note.trim().slice(0, 500);
  if (action === "note") {
    if (!text) return { ok: false, error: "اكتب الملاحظة" };
    await db.insert(orderEvents).values({ orderId, kind: "note", note: text, staffId: me.id, by: me.name });
  } else {
    await db.transaction((tx) => applyStatus(tx, orderId, action === "delivered" ? "delivered" : "cancelled", me, action === "refused" ? `رفض العميل الاستلام${text ? ` — ${text}` : ""}` : text));
  }
  refresh();
  return { ok: true };
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
  condition: z.enum(["new", "used"]).default("new"),
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
  await requirePerm("catalog");
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `بيانات غير صالحة: ${issue.path.join(".")}` };
  }
  const p = parsed.data;

  // Products belong to the most precise category, never to a family that has sub-categories.
  const [cat] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, p.categoryId)).limit(1);
  if (!cat) return { ok: false, error: "الفئة غير موجودة" };
  const [{ kids }] = await db.select({ kids: count() }).from(categories).where(eq(categories.parentId, p.categoryId));
  if (kids > 0) return { ok: false, error: "اختر فئة فرعية دقيقة، وليس الفئة الرئيسية" };

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
        condition: p.condition,
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
  await requirePerm("catalog");
  await db.update(products).set({ active }).where(eq(products.id, id));
  refresh();
}

export async function deleteProduct(id: number) {
  await requirePerm("catalog");
  await db.delete(products).where(eq(products.id, id));
  refresh();
}

/* ---------- categories ---------- */

const categorySchema = z.object({
  id: z.number().int().positive().optional(),
  nameFr: z.string().trim().min(1).max(60),
  nameAr: z.string().trim().min(1).max(60),
  slug: z.string().trim().max(60).default(""),
  icon: z.enum(CATEGORY_ICONS.map(([k]) => k) as [string, ...string[]]),
  sort: z.number().int().min(0).max(999),
  parentId: z.number().int().positive().nullable().optional(),
});

export async function saveCategory(input: z.input<typeof categorySchema>): Promise<{ ok: boolean; error?: string }> {
  await requirePerm("catalog");
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "بيانات غير صالحة" };
  const c = parsed.data;
  const slug = slugify(c.slug || c.nameFr);
  if (!slug) return { ok: false, error: "معرّف الرابط غير صالح" };
  const parentId = c.parentId ?? null;
  if (parentId != null) {
    if (parentId === c.id) return { ok: false, error: "لا يمكن أن تكون الفئة تابعة لنفسها" };
    const [parent] = await db.select().from(categories).where(eq(categories.id, parentId)).limit(1);
    if (!parent) return { ok: false, error: "الفئة الرئيسية غير موجودة" };
    if (parent.parentId != null) return { ok: false, error: "المستوى الثاني هو الأخير: اختر فئة رئيسية" };
    const [{ held }] = await db.select({ held: count() }).from(products).where(eq(products.categoryId, parentId));
    if (held > 0) return { ok: false, error: "هذه الفئة تحتوي منتجات مباشرة: انقلها إلى فئة فرعية أولًا" };
    if (c.id) {
      const [{ kids }] = await db.select({ kids: count() }).from(categories).where(eq(categories.parentId, c.id));
      if (kids > 0) return { ok: false, error: "هذه الفئة لها فئات فرعية، لا يمكن جعلها فرعية" };
    }
  }
  const values = { nameFr: c.nameFr, nameAr: c.nameAr, slug, icon: c.icon, sort: c.sort, parentId };
  try {
    if (c.id) await db.update(categories).set(values).where(eq(categories.id, c.id));
    else await db.insert(categories).values(values);
  } catch {
    return { ok: false, error: "معرّف الرابط مستخدم مسبقًا" };
  }
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: number): Promise<{ ok: boolean; error?: string }> {
  await requirePerm("catalog");
  const [{ n }] = await db.select({ n: count() }).from(products).where(eq(products.categoryId, id));
  if (n > 0) return { ok: false, error: "لا يمكن حذف فئة تحتوي على منتجات" };
  const [{ kids }] = await db.select({ kids: count() }).from(categories).where(eq(categories.parentId, id));
  if (kids > 0) return { ok: false, error: "لا يمكن حذف فئة لها فئات فرعية" };
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
  await requirePerm("coupons");
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
  await requirePerm("coupons");
  await db.update(coupons).set({ active }).where(eq(coupons.id, id));
  refresh();
}

export async function deleteCoupon(id: number) {
  await requirePerm("coupons");
  await db.delete(coupons).where(eq(coupons.id, id));
  refresh();
}
