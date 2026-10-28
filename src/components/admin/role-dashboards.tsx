import Link from "next/link";
import { and, count, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { AlertTriangle, CheckCircle2, Clock, ImageOff, PackageX, Truck, UserX } from "lucide-react";
import { db } from "@/db";
import { orders, products, staff, variants } from "@/db/schema";
import { cn } from "@/lib/utils";
import { OrdersTable } from "./orders-table";
import { getT } from "@/lib/admin-lang";

type Tile = { label: string; value: number; icon: typeof Clock; tone: string; href?: string };

function Tiles({ items }: { items: Tile[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {items.map((s) => {
        const body = (
          <>
            <span className={cn("grid h-10 w-10 place-items-center rounded-xl", s.tone)}><s.icon className="h-5 w-5" aria-hidden="true" /></span>
            <p className="mt-4 text-2xl font-extrabold tabular-nums">{s.value}</p>
            <p className="mt-0.5 text-xs text-muted sm:text-sm">{s.label}</p>
          </>
        );
        return (
          <li key={s.label}>
            {s.href ? (
              <Link href={s.href} className="block rounded-2xl border border-line bg-surface p-4 transition hover:border-brand sm:p-5">{body}</Link>
            ) : (
              <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Order manager: what needs confirming, assigning and following up today. */
export async function OrdersDashboard({ name }: { name: string }) {
  const T = await getT();
  const [[pending], [confirmed], [onRoute], [unassigned], drivers, recent] = await Promise.all([
    db.select({ n: count() }).from(orders).where(eq(orders.status, "pending")),
    db.select({ n: count() }).from(orders).where(eq(orders.status, "confirmed")),
    db.select({ n: count() }).from(orders).where(eq(orders.status, "shipped")),
    db.select({ n: count() }).from(orders).where(and(inArray(orders.status, ["confirmed", "shipped"]), isNull(orders.driverId))),
    db
      .select({ id: staff.id, name: staff.name, n: sql<number>`count(${orders.id}) filter (where ${orders.status} in ('confirmed','shipped'))::int` })
      .from(staff)
      .leftJoin(orders, eq(orders.driverId, staff.id))
      .where(and(eq(staff.role, "driver"), eq(staff.active, true)))
      .groupBy(staff.id),
    db.select().from(orders).where(inArray(orders.status, ["pending", "confirmed"])).orderBy(orders.createdAt).limit(10),
  ]);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">{T("مرحبًا {name}", { name })}</h1>
        <p className="mt-1 text-sm text-muted">{T("الطلبات التي تحتاج تدخّلك")}</p>
      </div>
      <Tiles
        items={[
          { label: T("بانتظار التأكيد"), value: pending.n, icon: Clock, tone: "bg-warn-50 text-warn", href: "/admin/orders?status=pending" },
          { label: T("مؤكَّدة للتجهيز"), value: confirmed.n, icon: CheckCircle2, tone: "bg-brand-50 text-brand", href: "/admin/orders?status=confirmed" },
          { label: T("قيد التوصيل"), value: onRoute.n, icon: Truck, tone: "bg-fg/10 text-fg", href: "/admin/orders?status=shipped" },
          { label: T("بدون موصّل"), value: unassigned.n, icon: UserX, tone: "bg-hot-50 text-hot" },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-line bg-surface">
          <h2 className="p-5 pb-3 font-bold">{T("الأقدم أولًا: بانتظار التأكيد أو التجهيز")}</h2>
          <OrdersTable rows={recent} />
        </section>
        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-3 font-bold">{T("الموصّلون")}</h2>
          {drivers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">{T("لا يوجد موصّلون بعد")}</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {drivers.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2.5"><span>{d.name}</span><span className="chip bg-mist text-ink-2">{T("{n} طلب", { n: d.n })}</span></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/** Catalogue manager: stock and listing quality. */
export async function CatalogDashboard({ name }: { name: string }) {
  const T = await getT();
  const [[active], [outOfStock], [noImage], [inactive], low] = await Promise.all([
    db.select({ n: count() }).from(products).where(eq(products.active, true)),
    db
      .select({ n: count() })
      .from(products)
      .where(and(eq(products.active, true), sql`not exists (select 1 from variants v where v.product_id = ${products.id} and v.stock > 0)`)),
    db.select({ n: count() }).from(products).where(and(eq(products.active, true), sql`jsonb_array_length(${products.images}) = 0`)),
    db.select({ n: count() }).from(products).where(eq(products.active, false)),
    db
      .select({ id: products.id, name: products.name, sku: variants.sku, label: sql<string>`concat_ws(' · ', nullif(${variants.colorFr}, ''), nullif(${variants.storage}, ''))`, stock: variants.stock })
      .from(variants)
      .innerJoin(products, eq(variants.productId, products.id))
      .where(and(eq(products.active, true), lte(variants.stock, 3)))
      .orderBy(variants.stock, desc(products.createdAt))
      .limit(15),
  ]);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">{T("مرحبًا {name}", { name })}</h1>
        <p className="mt-1 text-sm text-muted">{T("حالة المنتجات والمخزون")}</p>
      </div>
      <Tiles
        items={[
          { label: T("منتجات معروضة"), value: active.n, icon: CheckCircle2, tone: "bg-ok-50 text-ok", href: "/admin/products" },
          { label: T("نافدة بالكامل"), value: outOfStock.n, icon: PackageX, tone: "bg-hot-50 text-hot" },
          { label: T("بدون صورة"), value: noImage.n, icon: ImageOff, tone: "bg-warn-50 text-warn" },
          { label: T("مخفية"), value: inactive.n, icon: AlertTriangle, tone: "bg-mist text-ink-2" },
        ]}
      />
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="mb-3 font-bold">{T("مخزون منخفض أو نافد (3 قطع أو أقل)")}</h2>
        {low.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{T("المخزون كافٍ")}</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {low.map((r) => (
              <li key={r.sku}>
                <Link href={`/admin/products/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-brand">
                  <span className="min-w-0 truncate">{r.name} <span className="text-xs text-muted">{r.label}</span></span>
                  <span className={cn("chip shrink-0", r.stock === 0 ? "bg-hot-50 text-hot" : "bg-warn-50 text-warn")}>{r.stock === 0 ? T("نفد") : r.stock}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
