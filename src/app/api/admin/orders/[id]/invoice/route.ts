import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, staff, stores, warranties } from "@/db/schema";
import { store } from "@/config/store";
import { can, getMember } from "@/lib/auth";
import { getT } from "@/lib/admin-lang";
import { eur } from "@/lib/admin-ui";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Printable customer invoice with the warranty of each unit (IMEI, end date, public check link).
 * `?format=receipt` gives the 80 mm till ticket instead of A4.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const member = await getMember();
  if (!member || !(can(member.role, "orders") || can(member.role, "pos") || can(member.role, "warranties"))) return new Response("unauthorized", { status: 401 });
  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id)) return new Response("not found", { status: 404 });
  const [row] = await db
    .select({ o: orders, shop: stores, seller: staff.name })
    .from(orders)
    .leftJoin(stores, eq(stores.id, orders.storeId))
    .leftJoin(staff, eq(staff.id, orders.sellerId))
    .where(eq(orders.id, id))
    .limit(1);
  if (!row) return new Response("not found", { status: 404 });
  const { o, shop, seller } = row;
  // A seller only prints their own shop's sales.
  if (member.role === "seller") {
    const [me] = member.id ? await db.select({ storeId: staff.storeId }).from(staff).where(eq(staff.id, member.id)).limit(1) : [];
    if (!me?.storeId || me.storeId !== o.storeId) return new Response("unauthorized", { status: 401 });
  }
  const [items, ws] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)).orderBy(asc(orderItems.id)),
    db.select().from(warranties).where(eq(warranties.orderId, id)).orderBy(asc(warranties.id)),
  ]);
  const T = await getT();
  const rtl = T.lang === "ar";
  const receipt = new URL(req.url).searchParams.get("format") === "receipt";
  const dfmt = (d: Date, time = false) =>
    new Intl.DateTimeFormat(rtl ? "ar-u-nu-latn" : "fr-FR", { dateStyle: time ? "short" : "long", ...(time ? { timeStyle: "short" } : {}), timeZone: "Africa/Casablanca" }).format(d);
  const site = store.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const wLink = (code: string) => `${site}/${rtl ? "ar" : "fr"}/garantie/${code}`;
  const pay = o.paymentMethod === "card" ? T("بطاقة") : o.paymentMethod === "transfer" ? T("تحويل") : o.paymentMethod === "cash" ? T("نقدًا") : T("الدفع عند الاستلام");
  const shopLine = shop ? `${esc(rtl ? shop.nameAr : shop.nameFr)}<br>${esc(shop.address)}<br>${esc(shop.phone)}` : store.contact.addresses.map((a) => esc(a.line)).join("<br>");
  const customer = `${o.firstName} ${o.lastName}`.trim();
  const cashNote = o.adminNote.split("\n").find((l) => l.startsWith("Reçu "));
  const wOf = (itemId: number) => ws.filter((w) => w.orderItemId === itemId && !w.voided);

  const head = (title: string, css: string) => `<!doctype html><html lang="${T.lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(title)} ${esc(o.number)}</title>
<style>*{box-sizing:border-box}body{font:13px/1.45 Arial,"Noto Sans Arabic",sans-serif;color:#111;margin:0;background:#f2f2f2}
.n{text-align:end;white-space:nowrap;direction:ltr;unicode-bidi:embed}.ltr{direction:ltr;unicode-bidi:embed}.muted{color:#666}
.bar{text-align:center;margin:12px}.bar button{font:inherit;padding:8px 16px;border:0;border-radius:6px;background:#c8102e;color:#fff;cursor:pointer}
@media print{body{background:#fff}.bar{display:none}}${css}</style></head><body>
<div class="bar"><button onclick="print()">${esc(T("طباعة"))}</button></div>`;
  const foot = `<script>addEventListener("load",function(){setTimeout(print,300)})</script></body></html>`;

  let html: string;
  if (receipt) {
    const lines = items
      .map((i) => {
        const serials = wOf(i.id).filter((w) => w.serial).map((w) => `<div class="s ltr">IMEI ${esc(w.serial)}</div>`).join("");
        return `<tr><td>${esc(i.name)}${i.variantLabel ? ` <span class="muted">${esc(i.variantLabel)}</span>` : ""}<br><span class="muted ltr">${i.quantity} × ${eur(i.unitPrice)}</span>${serials}</td><td class="n">${eur(i.unitPrice * i.quantity)}</td></tr>`;
      })
      .join("");
    const months = [...new Set(ws.filter((w) => !w.voided).map((w) => w.months))];
    html = `${head(T("تذكرة"), `.t{width:80mm;margin:0 auto 16px;background:#fff;padding:5mm 4mm;font-size:12px}
.c{text-align:center}.brand{font-size:18px;font-weight:800}.brand span{color:#c8102e}hr{border:0;border-top:1px dashed #999;margin:8px 0}
table{width:100%;border-collapse:collapse}td{padding:3px 0;vertical-align:top}.s{font-size:11px;color:#333}.tot td{font-size:15px;font-weight:800;padding-top:6px}
@page{size:80mm auto;margin:0}@media print{.t{margin:0;width:80mm}}`)}
<div class="t">
<div class="c"><div class="brand">ELECTRO <span>SALAM</span></div><div class="muted">${shopLine}</div></div><hr>
<div><span class="ltr">${esc(o.number)}</span> · ${esc(dfmt(o.createdAt, true))}${seller ? `<br>${esc(T("البائع"))} : ${esc(seller)}` : ""}${customer ? `<br>${esc(T("العميل"))} : ${esc(customer)}` : ""}${o.phone ? ` · <span class="ltr">${esc(o.phone)}</span>` : ""}</div><hr>
<table><tbody>${lines}</tbody></table><hr>
<table><tbody>
${o.discount ? `<tr><td>${esc(T("المجموع الفرعي"))}</td><td class="n">${eur(o.subtotal)}</td></tr><tr><td>${esc(T("خصم"))}</td><td class="n">−${eur(o.discount)}</td></tr>` : ""}
${o.shippingCost ? `<tr><td>${esc(T("التوصيل"))}</td><td class="n">${eur(o.shippingCost)}</td></tr>` : ""}
<tr class="tot"><td>${esc(T("المجموع"))}</td><td class="n">${eur(o.total)}</td></tr>
<tr><td>${esc(T("طريقة الدفع"))}</td><td class="n">${esc(pay)}</td></tr>
${cashNote ? `<tr><td colspan="2" class="muted ltr">${esc(cashNote)} DH</td></tr>` : ""}
</tbody></table>
${months.length ? `<hr><div class="c"><strong>${esc(T("الضمان"))} : ${months.map((m) => esc(m === 1 ? T("شهر واحد") : T("{n} شهرًا", { n: m }))).join(" / ")}</strong><br><span class="muted">${esc(T("تحقق من ضمانك في أي وقت:"))}</span><br>${ws
          .filter((w) => !w.voided)
          .map((w) => `<span class="ltr">${esc(wLink(w.code))}</span>`)
          .join("<br>")}</div>` : ""}
<hr><div class="c">${esc(T("شكرًا لثقتكم"))}<br><span class="ltr">${esc(site)}</span></div>
</div>${foot}`;
  } else {
    const lines = items
      .map((i) => `<tr><td>${esc(i.name)}${i.variantLabel ? `<br><small>${esc(i.variantLabel)}</small>` : ""}</td><td class="c">${i.quantity}</td><td class="n">${eur(i.unitPrice)}</td><td class="n">${eur(i.unitPrice * i.quantity)}</td></tr>`)
      .join("");
    const wRows = ws
      .filter((w) => !w.voided)
      .map((w) => `<tr><td>${esc(w.productName)}${w.variantLabel ? `<br><small>${esc(w.variantLabel)}</small>` : ""}</td><td class="ltr mono">${esc(w.serial || "—")}</td><td>${esc(dfmt(w.startsAt))}</td><td>${esc(dfmt(w.endsAt))}</td><td class="ltr mono">${esc(w.code)}</td></tr>`)
      .join("");
    const total = (label: string, value: string, strong = false) => `<tr${strong ? ' class="strong"' : ""}><td>${esc(label)}</td><td class="n">${value}</td></tr>`;
    html = `${head(T("فاتورة"), `.page{max-width:780px;margin:0 auto 24px;background:#fff;padding:32px 36px;border-radius:8px}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:3px solid #c8102e;padding-bottom:16px}
.brand{font-size:24px;font-weight:800;letter-spacing:.5px}.brand span{color:#c8102e}h1{font-size:18px;margin:0 0 4px}.no{font-size:22px;font-weight:800;direction:ltr;unicode-bidi:embed}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0}.box{border:1px solid #ddd;border-radius:6px;padding:12px 14px}.box h2,h3{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#c8102e;margin:0 0 6px}
table{width:100%;border-collapse:collapse}th,td{padding:8px 6px;border-bottom:1px solid #e5e5e5;text-align:start;vertical-align:top}th{font-size:11px;text-transform:uppercase;color:#666;letter-spacing:.05em}.c{text-align:center}
.totals{width:300px;margin-inline-start:auto;margin-top:12px}.totals td{border:none;padding:4px 6px}.strong td{font-size:16px;font-weight:800;border-top:2px solid #111;padding-top:8px}
h3{margin-top:28px}.mono{font-family:ui-monospace,Menlo,monospace;font-size:12px}.terms{margin-top:14px;padding:12px 14px;background:#f7f7f7;border-radius:6px;font-size:12px;color:#333}
@page{size:A4;margin:14mm}@media print{.page{margin:0;max-width:none;border-radius:0;padding:0}}`)}
<div class="page">
<header><div><div class="brand">ELECTRO <span>SALAM</span></div><div class="muted">${shopLine}<br>${esc(store.contact.email)}</div></div>
<div style="text-align:end"><h1>${esc(T("فاتورة"))}</h1><div class="no">${esc(o.number)}</div><div class="muted">${esc(dfmt(o.createdAt))}</div></div></header>
<div class="grid">
<div class="box"><h2>${esc(T("العميل"))}</h2>${customer ? `<strong>${esc(customer)}</strong><br>` : ""}${o.phone ? `<span class="ltr">${esc(o.phone)}</span><br>` : ""}${o.email ? `<span class="ltr">${esc(o.email)}</span><br>` : ""}${o.address ? `${esc(o.address)}<br>${esc(`${o.postalCode} ${o.city}`.trim())}` : ""}</div>
<div class="box"><h2>${esc(T("الدفع"))}</h2>${esc(pay)}${seller ? `<br>${esc(T("البائع"))} : ${esc(seller)}` : ""}</div>
</div>
<table><thead><tr><th>${esc(T("المنتج"))}</th><th class="c">${esc(T("الكمية"))}</th><th class="n">${esc(T("السعر"))}</th><th class="n">${esc(T("المجموع"))}</th></tr></thead><tbody>${lines}</tbody></table>
<table class="totals"><tbody>
${total(T("المجموع الفرعي"), eur(o.subtotal))}
${o.discount ? total(T("خصم"), `−${eur(o.discount)}`) : ""}
${o.shippingCost ? total(T("التوصيل"), eur(o.shippingCost)) : ""}
${total(T("المجموع"), eur(o.total), true)}
</tbody></table>
${wRows ? `<h3>${esc(T("شهادة الضمان"))}</h3>
<table><thead><tr><th>${esc(T("المنتج"))}</th><th>IMEI / N° série</th><th>${esc(T("من"))}</th><th>${esc(T("إلى"))}</th><th>${esc(T("رمز الضمان"))}</th></tr></thead><tbody>${wRows}</tbody></table>
<div class="terms">${esc(T("يمكن التحقق من كل ضمان على:"))} <span class="ltr">${esc(site)}/${rtl ? "ar" : "fr"}/garantie/&lt;${esc(T("رمز الضمان"))}&gt;</span><br>${esc(T("الضمان يغطي عيوب التصنيع ولا يشمل الأضرار الناتجة عن حادث أو سوء استعمال أو إهمال أو تعديل للمنتج. الفاتورة ضرورية للاستفادة من خدمة ما بعد البيع والضمان."))}</div>` : ""}
</div>${foot}`;
  }
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
