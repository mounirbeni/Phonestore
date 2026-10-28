import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, staff, stores } from "@/db/schema";
import { can, getMember } from "@/lib/auth";
import { getT } from "@/lib/admin-lang";
import { eur } from "@/lib/admin-ui";
import { todayInShop } from "@/lib/shop-day";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** End-of-day till report of a shop (80 mm): sales, totals per payment method, units sold. */
export async function GET(req: Request) {
  const member = await getMember();
  if (!member || !can(member.role, "pos")) return new Response("unauthorized", { status: 401 });
  const storeId = parseInt(new URL(req.url).searchParams.get("store") ?? "", 10);
  if (!Number.isInteger(storeId)) return new Response("not found", { status: 404 });
  if (member.role === "seller") {
    const [me] = member.id ? await db.select({ storeId: staff.storeId }).from(staff).where(eq(staff.id, member.id)).limit(1) : [];
    if (me?.storeId !== storeId) return new Response("unauthorized", { status: 401 });
  }
  const [shop] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1);
  if (!shop) return new Response("not found", { status: 404 });
  const sales = await db
    .select({ o: orders, seller: staff.name })
    .from(orders)
    .leftJoin(staff, eq(staff.id, orders.sellerId))
    .where(and(eq(orders.channel, "store"), eq(orders.storeId, storeId), todayInShop()))
    .orderBy(asc(orders.createdAt));
  const valid = sales.filter((s) => s.o.status !== "cancelled");
  const items = valid.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, valid.map((s) => s.o.id))) : [];
  const T = await getT();
  const rtl = T.lang === "ar";
  const time = new Intl.DateTimeFormat(rtl ? "ar-u-nu-latn" : "fr-FR", { timeStyle: "short", timeZone: "Africa/Casablanca" });
  const day = new Intl.DateTimeFormat(rtl ? "ar-u-nu-latn" : "fr-FR", { dateStyle: "full", timeZone: "Africa/Casablanca" }).format(new Date());
  const sum = (p?: string) => valid.filter((s) => !p || s.o.paymentMethod === p).reduce((n, s) => n + s.o.total, 0);
  const units = new Map<string, number>();
  for (const i of items) units.set(i.name, (units.get(i.name) ?? 0) + i.quantity);
  const row = (a: string, b: string, cls = "") => `<tr${cls ? ` class="${cls}"` : ""}><td>${a}</td><td class="n">${b}</td></tr>`;
  const html = `<!doctype html><html lang="${T.lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(T("إغلاق الصندوق"))}</title>
<style>*{box-sizing:border-box}body{font:12px/1.45 Arial,"Noto Sans Arabic",sans-serif;color:#111;margin:0;background:#f2f2f2}
.t{width:80mm;margin:0 auto 16px;background:#fff;padding:5mm 4mm}.c{text-align:center}.muted{color:#666}hr{border:0;border-top:1px dashed #999;margin:8px 0}
table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}.n{text-align:end;white-space:nowrap;direction:ltr;unicode-bidi:embed}.b td{font-weight:800;font-size:14px}.x{text-decoration:line-through;color:#999}
.bar{text-align:center;margin:12px}.bar button{font:inherit;padding:8px 16px;border:0;border-radius:6px;background:#c8102e;color:#fff;cursor:pointer}
@page{size:80mm auto;margin:0}@media print{body{background:#fff}.bar{display:none}.t{margin:0}}</style></head><body>
<div class="bar"><button onclick="print()">${esc(T("طباعة"))}</button></div>
<div class="t">
<div class="c"><strong>${esc(T("إغلاق الصندوق"))}</strong><br>${esc(rtl ? shop.nameAr : shop.nameFr)}<br><span class="muted">${esc(day)}</span></div><hr>
<table><tbody>
${row(esc(T("عدد المبيعات")), String(valid.length))}
${row(esc(T("نقدًا")), eur(sum("cash")))}
${row(esc(T("بطاقة")), eur(sum("card")))}
${row(esc(T("تحويل")), eur(sum("transfer")))}
${row(esc(T("المجموع")), eur(sum()), "b")}
</tbody></table><hr>
<table><tbody>${sales.map(({ o, seller }) => row(`<span class="n">${esc(o.number)}</span> ${esc(time.format(o.createdAt))}${seller ? ` · ${esc(seller)}` : ""}`, eur(o.total), o.status === "cancelled" ? "x" : "")).join("") || row(esc(T("لا توجد مبيعات اليوم")), "")}</tbody></table>
${units.size ? `<hr><table><tbody>${[...units].map(([n, q]) => row(esc(n), `× ${q}`)).join("")}</tbody></table>` : ""}
<hr><div class="muted">${esc(T("طُبع بواسطة"))} ${esc(T(member.name))} · ${esc(time.format(new Date()))}</div>
<br><div>${esc(T("التوقيع"))} : ____________________</div>
</div><script>addEventListener("load",function(){setTimeout(print,300)})</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
