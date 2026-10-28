import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { store } from "@/config/store";
import { formatPrice } from "@/lib/money";
import { getDictionary } from "@/lib/dictionary";
import { fmt } from "@/lib/utils";
import { pick, type Locale } from "@/lib/i18n";
import type { Order, OrderItem } from "@/db/schema";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * SMTP settings come from the environment: SMTP_HOST, SMTP_PORT (587 by default, 465 = implicit TLS),
 * SMTP_USER, SMTP_PASS, optional SMTP_SECURE=true, and MAIL_FROM (defaults to SMTP_USER).
 */
let transport: Transporter | null | undefined;
function getTransport() {
  if (transport !== undefined) return transport;
  const host = process.env.SMTP_HOST;
  if (!host) return (transport = null);
  const port = Number(process.env.SMTP_PORT || 587);
  transport = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
    // Order e-mails are built from our own data only; never let a message pull local files or URLs.
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return transport;
}

async function send(to: string, subject: string, html: string) {
  const t = getTransport();
  if (!t) {
    console.log(`[mail] SMTP_HOST not set — skipped "${subject}" to ${to}`);
    return;
  }
  const from = process.env.MAIL_FROM || (process.env.SMTP_USER ? `${store.name} <${process.env.SMTP_USER}>` : undefined);
  await t.sendMail({ from, to, subject, html, text: htmlToText(html) });
}

/** Plain-text part for clients (and spam filters) that prefer it. */
const htmlToText = (html: string) =>
  html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|tr|h\d|div)>/gi, "\n")
    .replace(/<\/td>/gi, "  ")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/gi, "$2: $1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

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
<p style="text-align:end;font-size:16px">${d.mail.total}: <strong>${formatPrice(order.total, locale)}</strong>${order.deposit ? `<br>${d.order.deposit}: ${formatPrice(order.deposit, locale)}` : ""}</p>
<p style="text-align:end;font-size:18px"><strong>${d.mail.pay}: ${formatPrice(order.total - order.deposit, locale)}</strong></p>
${order.deposit ? depositHtml(order, locale) : ""}
<p style="font-size:13px;color:#555">${esc(order.firstName)} ${esc(order.lastName)}<br>${esc(order.address)} ${esc(order.address2)}<br>${esc(order.postalCode)} ${esc(order.city)} (${esc(order.country)})<br>${esc(order.phone)}</p>
${link ? `<p><a href="${link.href}" style="display:inline-block;background:#0b0d12;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">${esc(link.label)}</a></p>` : ""}
</div>`;
}

/** How to pay the advance: amount, account and the order number as the transfer reference. */
function depositHtml(order: Order, locale: Locale) {
  const d = getDictionary(locale);
  const amount = formatPrice(order.deposit, locale);
  const b = store.deposit;
  const rows = [
    b.holder && [d.order.holder, esc(b.holder)],
    b.bank && [d.order.bank, esc(b.bank)],
    b.rib && [d.order.rib, `<span dir="ltr" style="font-family:monospace;font-size:15px">${esc(b.rib)}</span>`],
    [d.order.reference, `<span dir="ltr">${esc(order.number)}</span>`],
  ]
    .filter((r): r is string[] => !!r)
    .map(([k, v]) => `<tr><td style="padding:4px 0;color:#555">${k}</td><td style="padding:4px 0"><strong>${v}</strong></td></tr>`)
    .join("");
  return `<div style="margin:20px 0;padding:16px;border:2px solid #dc1428;border-radius:12px">
<p style="margin:0 0 8px;font-size:16px"><strong>${esc(fmt(d.order.depositTitle, { amount }))}</strong></p>
<p style="margin:0 0 10px;font-size:14px">${esc(fmt(d.order.depositText, { amount, number: order.number }))}</p>
${b.rib ? `<table style="font-size:14px;border-collapse:collapse">${rows}</table>` : `<p style="font-size:14px">${esc(d.order.depositNoBank)}</p>`}
<p style="margin:10px 0 0;font-size:12px;color:#777">${esc(d.order.depositPolicy)}</p>
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
      await send(owner, `Nouvelle commande ${order.number} — ${formatPrice(order.total, "fr")}`, orderHtml(order, items, "fr", `Nouvelle commande de ${order.firstName} ${order.lastName}`));
    }
  } catch (e) {
    console.error("[mail] failed", e);
  }
}

export { pick };

/* ---------- support ---------- */

type TicketMail = { number: string; token: string; locale: string; name: string; email: string; subject: string };

const ticketLink = (t: TicketMail) => `${store.url}/${t.locale === "ar" ? "ar" : "fr"}/support/${t.number}?t=${t.token}`;

function ticketHtml(t: TicketMail, locale: Locale, intro: string, body: string, withLink: boolean) {
  const d = getDictionary(locale);
  return `<div dir="${locale === "ar" ? "rtl" : "ltr"}" style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#0b0d12">
<h2>${esc(store.name)}</h2><p>${esc(intro)}</p>
<p><strong>${esc(fmt(d.support.ticket, { number: t.number }))}</strong> — ${esc(t.subject)}</p>
<div style="white-space:pre-wrap;border-inline-start:3px solid #c8102e;padding:8px 12px;background:#f6f6f6">${esc(body)}</div>
${withLink ? `<p><a href="${ticketLink(t)}" style="display:inline-block;background:#0b0d12;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none">${esc(d.support.viewTicket)}</a></p>` : ""}
</div>`;
}

/** Acknowledgement to the customer and a heads-up to the team (SUPPORT_NOTIFY_EMAIL, else ORDER_NOTIFY_EMAIL). */
export async function sendTicketCreated(t: TicketMail, message: string) {
  const locale = (t.locale === "ar" ? "ar" : "fr") as Locale;
  const d = getDictionary(locale);
  try {
    await send(t.email, fmt(d.support.mailSubject, { number: t.number }), ticketHtml(t, locale, d.support.mailIntro, message, true));
    const team = process.env.SUPPORT_NOTIFY_EMAIL || process.env.ORDER_NOTIFY_EMAIL;
    if (team) await send(team, `Nouveau message ${t.number} — ${t.subject}`, ticketHtml(t, "fr", `Nouveau message de ${t.name} (${t.email})`, message, false));
  } catch (e) {
    console.error("[mail] ticket failed", e);
  }
}

/** Tells the customer the team has answered. */
export async function sendTicketReply(t: TicketMail, reply: string) {
  const locale = (t.locale === "ar" ? "ar" : "fr") as Locale;
  const d = getDictionary(locale);
  try {
    await send(t.email, fmt(d.support.replySubject, { number: t.number }), ticketHtml(t, locale, d.support.replyIntro, reply, true));
  } catch (e) {
    console.error("[mail] ticket reply failed", e);
  }
}
