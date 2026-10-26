import "server-only";
import { store } from "@/config/store";
import { formatPrice } from "@/lib/money";
import { getDictionary } from "@/lib/dictionary";
import { fmt } from "@/lib/utils";
import { pick, type Locale } from "@/lib/i18n";
import type { Order, OrderItem } from "@/db/schema";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[mail] RESEND_API_KEY not set — skipped "${subject}" to ${to}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.MAIL_FROM ?? `${store.name} <onboarding@resend.dev>`, to, subject, html }),
  });
  if (!res.ok) console.error("[mail] Resend error", res.status, await res.text());
}

function orderHtml(order: Order, items: OrderItem[], locale: Locale, intro: string, link?: { href: string; label: string }) {
  const d = getDictionary(locale);
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.name)}${i.variantLabel ? `<br><span style="color:#777;font-size:12px">${esc(i.variantLabel)}</span>` : ""}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">×${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:end">${formatPrice(i.unitPrice * i.quantity, locale)}</td></tr>`,
    )
    .join("");
  return `<div dir="${locale === "ar" ? "rtl" : "ltr"}" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b0d12">
<h2>${esc(store.name)}</h2><p>${esc(intro)}</p>
<p><strong>${fmt(d.order.number, { number: order.number })}</strong></p>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
<p style="text-align:end;font-size:14px">${d.common.shipping}: ${order.shippingCost === 0 ? d.common.free : formatPrice(order.shippingCost, locale)}${order.discount ? `<br>${d.common.discount}: −${formatPrice(order.discount, locale)}` : ""}</p>
<p style="text-align:end;font-size:18px"><strong>${d.mail.pay}: ${formatPrice(order.total, locale)}</strong></p>
<p style="font-size:13px;color:#555">${esc(order.firstName)} ${esc(order.lastName)}<br>${esc(order.address)} ${esc(order.address2)}<br>${esc(order.postalCode)} ${esc(order.city)} (${esc(order.country)})<br>${esc(order.phone)}</p>
${link ? `<p><a href="${link.href}" style="display:inline-block;background:#0b0d12;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">${esc(link.label)}</a></p>` : ""}
</div>`;
}

export async function sendOrderEmails(order: Order, items: OrderItem[]) {
  const locale = (order.locale === "ar" ? "ar" : "fr") as Locale;
  const d = getDictionary(locale);
  const href = `${store.url}/${locale}/order/${order.number}?t=${order.token}`;
  try {
    await send(
      order.email,
      fmt(d.mail.subject, { number: order.number }),
      orderHtml(order, items, locale, d.mail.intro, { href, label: d.mail.trackLink }),
    );
    const owner = process.env.ORDER_NOTIFY_EMAIL;
    if (owner) {
      await send(owner, `🛒 ${order.number} — ${formatPrice(order.total, "fr")}`, orderHtml(order, items, "fr", `Nouvelle commande de ${order.firstName} ${order.lastName}`));
    }
  } catch (e) {
    console.error("[mail] failed", e);
  }
}

export { pick };
