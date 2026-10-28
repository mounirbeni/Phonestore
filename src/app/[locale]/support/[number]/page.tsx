import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Headset, MessageSquare, XCircle } from "lucide-react";
import { db } from "@/db";
import { supportTickets, ticketMessages } from "@/db/schema";
import { getDictionary } from "@/lib/dictionary";
import { isLocale } from "@/lib/i18n";
import { cn, fmt } from "@/lib/utils";
import { TicketReply } from "@/components/support/ticket-reply";

type Props = { params: Promise<{ locale: string; number: string }>; searchParams: Promise<{ t?: string }> };

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** The customer's private view of their request: the conversation (no internal notes) and a reply box. */
export default async function TicketPage({ params, searchParams }: Props) {
  const { locale, number } = await params;
  const { t } = await searchParams;
  if (!isLocale(locale)) notFound();
  const d = getDictionary(locale).support;
  const [ticket] = t ? await db.select().from(supportTickets).where(and(eq(supportTickets.number, number), eq(supportTickets.token, t))).limit(1) : [];
  if (!ticket)
    return (
      <div className="container-x grid min-h-[50vh] place-items-center py-20 text-center">
        <div><XCircle className="mx-auto h-12 w-12 text-muted" aria-hidden="true" /><p className="mt-4 font-semibold">{d.notFound}</p></div>
      </div>
    );
  const messages = await db
    .select()
    .from(ticketMessages)
    .where(and(eq(ticketMessages.ticketId, ticket.id), inArray(ticketMessages.author, ["customer", "staff"])))
    .orderBy(asc(ticketMessages.createdAt), asc(ticketMessages.id));
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "fr-FR", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="container-x pb-10 pt-8 sm:pt-12">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{fmt(d.ticket, { number: ticket.number })}</h1>
          <span className={cn("chip", ticket.status === "resolved" || ticket.status === "closed" ? "bg-ok-50 text-ok" : "bg-brand-50 text-brand")}>{d.statuses[ticket.status]}</span>
        </div>
        <p className="text-fg-2"><span className="text-muted">{d.types[ticket.type]} · </span>{ticket.subject}</p>
        <ol className="space-y-3">
          {messages.map((m) => {
            const mine = m.author === "customer";
            return (
              <li key={m.id} className={cn("max-w-[90%] rounded-2xl border p-4", mine ? "ms-auto border-line bg-mist" : "border-brand/30 bg-surface")}>
                <p className="mb-1.5 flex items-center gap-2 text-xs text-muted">
                  {mine ? <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" /> : <Headset className="h-3.5 w-3.5 text-brand" aria-hidden="true" />}
                  <b className={mine ? "text-fg" : "text-brand"}>{mine ? d.you : d.team}</b> · {when.format(m.createdAt)}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
              </li>
            );
          })}
        </ol>
        <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
          {ticket.status === "closed" ? <p className="text-sm text-muted">{d.closed}</p> : <TicketReply number={ticket.number} token={ticket.token} d={d} />}
        </section>
      </div>
    </div>
  );
}
