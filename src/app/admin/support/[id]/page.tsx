import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { AlertCircle, ArrowRight, ExternalLink, Headset, Lock, Mail, MessageCircle, Package, Phone, Settings2, User } from "lucide-react";
import { db } from "@/db";
import { orders, staff, supportTickets, ticketMessages } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { getT } from "@/lib/admin-lang";
import { dateTime, statusChip, statusLabel, waLink } from "@/lib/admin-ui";
import { ticketStatusChip, ticketStatusLabel, ticketTypeLabel } from "@/lib/support-ui";
import { store } from "@/config/store";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/admin/ui";
import { TicketComposer, TicketControls } from "@/components/admin/ticket-tools";

type Props = { params: Promise<{ id: string }> };

export default async function TicketDetail({ params }: Props) {
  const T = await getT();
  const me = await requirePerm("support");
  const id = parseInt((await params).id, 10);
  if (!Number.isInteger(id)) notFound();
  const [t] = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
  if (!t) notFound();
  const [messages, team, [order], others] = await Promise.all([
    db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, id)).orderBy(asc(ticketMessages.createdAt), asc(ticketMessages.id)),
    db.select({ id: staff.id, name: staff.name }).from(staff).where(and(eq(staff.active, true), inArray(staff.role, ["support", "orders"]))).orderBy(asc(staff.name)),
    t.orderNumber ? db.select().from(orders).where(eq(orders.number, t.orderNumber)).limit(1) : Promise.resolve([]),
    db.select({ id: supportTickets.id, number: supportTickets.number, subject: supportTickets.subject, status: supportTickets.status }).from(supportTickets).where(and(eq(supportTickets.email, t.email), ne(supportTickets.id, id))).orderBy(desc(supportTickets.createdAt)).limit(5),
  ]);
  // The order manager may open the linked order; a support member sees its summary only.
  const canOrders = me.role === "owner" || me.role === "orders";
  const customerLink = `${store.url}/${t.locale}/support/${t.number}?t=${t.token}`;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-5">
        <Link href="/admin/support" className="btn btn-ghost btn-sm !px-2" aria-label={T("رجوع")}><ArrowRight className="h-4.5 w-4.5 ltr:rotate-180" /></Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold sm:text-2xl">
            <span dir="ltr">{t.number}</span>
            <span className={cn("chip", ticketStatusChip[t.status])}>{T(ticketStatusLabel[t.status])}</span>
            {t.priority === "high" && <span className="chip bg-hot-50 text-hot"><AlertCircle className="h-3.5 w-3.5" />{T("أولوية عالية")}</span>}
          </h1>
          <p className="mt-1 truncate text-sm text-muted">{T(ticketTypeLabel[t.type])} · {t.subject}</p>
        </div>
        <a href={customerLink} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><ExternalLink className="h-4 w-4" aria-hidden="true" />{T("صفحة العميل")}</a>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-4">
          <ol className="space-y-3">
            {messages.map((m) => {
              if (m.author === "event")
                return (
                  <li key={m.id} className="flex items-center gap-2 px-2 text-xs text-muted">
                    <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {T(m.body)} · {T(m.by)} · {dateTime(m.createdAt, T.lang)}
                  </li>
                );
              const customer = m.author === "customer";
              const note = m.author === "note";
              return (
                <li key={m.id} className={cn("rounded-2xl border p-4", customer ? "border-line bg-surface" : note ? "border-warn/40 bg-warn-50" : "ms-6 border-brand/30 bg-brand/5")}>
                  <p className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {customer ? <User className="h-3.5 w-3.5" aria-hidden="true" /> : note ? <Lock className="h-3.5 w-3.5 text-warn" aria-hidden="true" /> : <Headset className="h-3.5 w-3.5 text-brand" aria-hidden="true" />}
                    <b className={customer ? "text-fg" : note ? "text-warn" : "text-brand"}>{customer ? m.by : `${T(m.by)}${note ? ` · ${T("ملاحظة داخلية")}` : ""}`}</b>
                    · {dateTime(m.createdAt, T.lang)}
                  </p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                </li>
              );
            })}
          </ol>
          <TicketComposer ticketId={t.id} closed={t.status === "closed"} />
        </div>

        <div className="space-y-5">
          <Panel title={T("المعالجة")} icon={Settings2}>
            <TicketControls ticketId={t.id} status={t.status} priority={t.priority} assigneeId={t.assigneeId} team={team} />
          </Panel>
          <Panel title={T("العميل")} icon={User}>
            <div className="space-y-2 text-sm">
              <p className="font-semibold">{t.name}</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted" aria-hidden="true" /><a className="break-all hover:underline" href={`mailto:${t.email}?subject=${encodeURIComponent(t.number)}`} dir="ltr">{t.email}</a></p>
              {t.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted" aria-hidden="true" /><a className="hover:underline" href={`tel:${t.phone}`} dir="ltr">{t.phone}</a></p>}
              <p className="text-xs text-muted">{T("لغة العميل:")} {t.locale === "ar" ? T("العربية") : T("الفرنسية")} · {dateTime(t.createdAt, T.lang)}</p>
              {t.phone && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <a href={`tel:${t.phone}`} className="btn btn-outline btn-sm"><Phone className="h-4 w-4" aria-hidden="true" />{T("اتصال")}</a>
                  <a href={`${waLink(t.phone)}?text=${encodeURIComponent(t.locale === "ar" ? `مرحبًا ${t.name}، بخصوص طلبك ${t.number} لدى ${store.name}: ` : `Bonjour ${t.name}, concernant votre demande ${t.number} chez ${store.name} : `)}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><MessageCircle className="h-4 w-4" aria-hidden="true" />WhatsApp</a>
                </div>
              )}
            </div>
          </Panel>
          {t.orderNumber && (
            <Panel title={T("الطلب المرتبط")} icon={Package}>
              {order ? (
                <div className="flex items-center justify-between gap-3 text-sm">
                  {canOrders ? <Link href={`/admin/orders/${order.id}`} className="font-semibold text-brand hover:underline" dir="ltr">{order.number}</Link> : <span className="font-semibold" dir="ltr">{order.number}</span>}
                  <span className={cn("chip", statusChip[order.status])}>{T(statusLabel[order.status])}</span>
                </div>
              ) : (
                <p className="text-sm text-muted">{T("رقم الطلب {n} غير موجود", { n: t.orderNumber })}</p>
              )}
            </Panel>
          )}
          {others.length > 0 && (
            <Panel title={T("رسائل أخرى من العميل")} icon={Mail}>
              <ul className="-my-1 divide-y divide-line text-sm">
                {others.map((o) => (
                  <li key={o.id}><Link href={`/admin/support/${o.id}`} className="flex items-center gap-2 py-2 hover:text-brand"><span className="shrink-0 font-semibold" dir="ltr">{o.number}</span><span className="min-w-0 flex-1 truncate text-muted">{o.subject}</span><span className={cn("chip shrink-0", ticketStatusChip[o.status])}>{T(ticketStatusLabel[o.status])}</span></Link></li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
