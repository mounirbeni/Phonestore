import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, staff } from "@/db/schema";
import { can, getMember } from "@/lib/auth";
import { getT } from "@/lib/admin-lang";
import { statusLabel } from "@/lib/admin-ui";
import { csvResponse, dh } from "@/lib/csv";
import { orderWhere, parseOrderFilter } from "@/lib/order-filters";

/** The orders the list shows (same filters), as a spreadsheet for accounting. */
export async function GET(req: Request) {
  const member = await getMember();
  if (!member || !can(member.role, "orders")) return new Response("unauthorized", { status: 401 });
  const T = await getT();
  const f = parseOrderFilter(Object.fromEntries(new URL(req.url).searchParams));
  const rows = await db
    .select({ o: orders, driver: staff.name })
    .from(orders)
    .leftJoin(staff, eq(orders.driverId, staff.id))
    .where(orderWhere(f))
    .orderBy(desc(orders.createdAt))
    .limit(5000);
  const items = rows.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((r) => r.o.id))) : [];
  const byOrder = new Map<number, string[]>();
  for (const i of items) byOrder.set(i.orderId, [...(byOrder.get(i.orderId) ?? []), `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} x${i.quantity}`]);
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });
  const header = [
    T("الطلب"), T("التاريخ"), T("الحالة"), T("التسبيق"), T("العميل"), T("الهاتف"), T("البريد الإلكتروني"), T("المدينة"), T("العنوان"), T("المنتجات"),
    T("المجموع الفرعي") + " (DH)", T("خصم") + " (DH)", T("التوصيل") + " (DH)", T("المجموع") + " (DH)", T("التسبيق") + " (DH)", T("المبلغ المطلوب عند الاستلام") + " (DH)", T("الكود"), T("الموصّل"),
  ];
  const data = rows.map(({ o, driver }) => [
    o.number,
    date.format(o.createdAt),
    T(statusLabel[o.status]),
    o.deposit > 0 ? (o.depositPaidAt ? T("تم الاستلام") : T("بانتظار التسبيق")) : "",
    `${o.firstName} ${o.lastName}`,
    o.phone,
    o.email,
    o.city,
    [o.address, o.address2].filter(Boolean).join(", "),
    (byOrder.get(o.id) ?? []).join(" | "),
    dh(o.subtotal),
    dh(o.discount),
    dh(o.shippingCost),
    dh(o.total),
    dh(o.deposit),
    dh(o.total - (o.depositPaidAt ? o.deposit : 0)),
    o.couponCode ?? "",
    driver ?? "",
  ]);
  return csvResponse(`commandes-${new Date().toISOString().slice(0, 10)}.csv`, header, data);
}
