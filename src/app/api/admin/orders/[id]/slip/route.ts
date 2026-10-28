import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, staff } from "@/db/schema";
import { store } from "@/config/store";
import { can, getMember } from "@/lib/auth";
import { getT } from "@/lib/admin-lang";
import { eur } from "@/lib/admin-ui";
import { dueOnDelivery } from "@/lib/pricing";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A printable delivery slip (A4/A5, black on white) that travels with the parcel; opens the print dialog. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getMember();
  if (!member || !can(member.role, "orders")) return new Response("unauthorized", { status: 401 });
  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id)) return new Response("not found", { status: 404 });
  const [row] = await db.select({ o: orders, driver: staff.name }).from(orders).leftJoin(staff, eq(orders.driverId, staff.id)).where(eq(orders.id, id)).limit(1);
  if (!row) return new Response("not found", { status: 404 });
  const { o, driver } = row;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(orderItems.id);
  const T = await getT();
  const rtl = T.lang === "ar";
  const date = new Intl.DateTimeFormat(rtl ? "ar-u-nu-latn" : "fr-FR", { dateStyle: "long" }).format(o.createdAt);
  const due = dueOnDelivery(o);
  const shop = store.contact.addresses.map((a) => esc(a.line)).join("<br>");
  const lines = items
    .map((i) => `<tr><td>${esc(i.name)}${i.variantLabel ? `<br><small>${esc(i.variantLabel)}</small>` : ""}</td><td class="c">${i.quantity}</td><td class="n">${eur(i.unitPrice)}</td><td class="n">${eur(i.unitPrice * i.quantity)}</td></tr>`)
    .join("");
  const total = (label: string, value: string, strong = false) => `<tr${strong ? ' class="strong"' : ""}><td>${esc(label)}</td><td class="n">${value}</td></tr>`;

  const html = `<!doctype html><html lang="${T.lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(T("وصل التوصيل"))} ${esc(o.number)}</title>
<style>
*{box-sizing:border-box}body{font:13px/1.45 Arial,"Noto Sans Arabic",sans-serif;color:#111;margin:0;background:#f2f2f2}
.page{max-width:780px;margin:24px auto;background:#fff;padding:32px 36px;border-radius:8px}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:3px solid #c8102e;padding-bottom:16px}
.brand{font-size:24px;font-weight:800;letter-spacing:.5px}.brand span{color:#c8102e}.muted{color:#666;font-size:12px}
h1{font-size:18px;margin:0 0 4px}.no{font-size:22px;font-weight:800;direction:ltr;unicode-bidi:embed}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0}
.box{border:1px solid #ddd;border-radius:6px;padding:12px 14px}.box h2{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#c8102e;margin:0 0 6px}
table{width:100%;border-collapse:collapse}th,td{padding:8px 6px;border-bottom:1px solid #e5e5e5;text-align:start;vertical-align:top}
th{font-size:11px;text-transform:uppercase;color:#666;letter-spacing:.05em}.c{text-align:center}.n{text-align:end;white-space:nowrap;direction:ltr;unicode-bidi:embed}
.totals{width:300px;margin-inline-start:auto;margin-top:12px}.totals td{border:none;padding:4px 6px}.strong td{font-size:16px;font-weight:800;border-top:2px solid #111;padding-top:8px}
.due{margin-top:18px;padding:14px;border:2px solid #111;border-radius:6px;display:flex;justify-content:space-between;font-size:18px;font-weight:800}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:40px}.sign div{border-top:1px solid #999;padding-top:6px;color:#666;font-size:12px}
.note{margin-top:14px;padding:10px 12px;background:#fff7e6;border-radius:6px}
.bar{max-width:780px;margin:16px auto 0;text-align:end}.bar button{font:inherit;padding:8px 16px;border:0;border-radius:6px;background:#c8102e;color:#fff;cursor:pointer}
@media print{body{background:#fff}.page{margin:0;max-width:none;border-radius:0;padding:0}.bar{display:none}}
</style></head><body>
<div class="bar"><button onclick="print()">${esc(T("طباعة"))}</button></div>
<div class="page">
<header><div><div class="brand">ELECTRO <span>SALAM</span></div><div class="muted">${shop}<br>${esc(store.contact.phone)} · ${esc(store.contact.email)}</div></div>
<div style="text-align:end"><h1>${esc(T("وصل التوصيل"))}</h1><div class="no">${esc(o.number)}</div><div class="muted">${esc(date)}</div></div></header>
<div class="grid">
<div class="box"><h2>${esc(T("التوصيل إلى"))}</h2><strong>${esc(`${o.firstName} ${o.lastName}`)}</strong><br><span dir="ltr">${esc(o.phone)}</span><br>${esc(o.address)}${o.address2 ? `, ${esc(o.address2)}` : ""}<br>${esc(`${o.postalCode} ${o.city}`.trim())}</div>
<div class="box"><h2>${esc(T("التوصيل"))}</h2>${esc(o.shippingMethod === "express" ? T("توصيل سريع") : T("توصيل عادي"))}${driver ? `<br>${esc(T("الموصّل"))} : ${esc(driver)}` : ""}</div>
</div>
<table><thead><tr><th>${esc(T("المنتج"))}</th><th class="c">${esc(T("الكمية"))}</th><th class="n">${esc(T("السعر"))}</th><th class="n">${esc(T("المجموع"))}</th></tr></thead><tbody>${lines}</tbody></table>
<table class="totals"><tbody>
${total(T("المجموع الفرعي"), eur(o.subtotal))}
${o.discount ? total(T("خصم"), `−${eur(o.discount)}`) : ""}
${total(T("التوصيل"), o.shippingCost ? eur(o.shippingCost) : esc(T("مجاني")))}
${total(T("المجموع"), eur(o.total), true)}
${o.deposit && o.depositPaidAt ? total(T("التسبيق") + " ✓", `−${eur(o.deposit)}`) : ""}
</tbody></table>
<div class="due"><span>${esc(T("المبلغ المطلوب عند الاستلام"))}</span><span class="n">${eur(due)}</span></div>
${o.customerNote ? `<div class="note"><strong>${esc(T("ملاحظة العميل"))} :</strong> ${esc(o.customerNote)}</div>` : ""}
<div class="sign"><div>${esc(T("توقيع الموصّل"))}</div><div>${esc(T("توقيع العميل عند الاستلام"))}</div></div>
</div>
<script>addEventListener("load",function(){setTimeout(print,300)})</script>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
