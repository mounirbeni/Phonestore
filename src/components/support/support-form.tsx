"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Send } from "lucide-react";
import { createTicket } from "@/app/actions/support";
import type { TicketType } from "@/db/schema";
import type { Dict } from "@/lib/dictionary";
import { localePath, type Locale } from "@/lib/i18n";
import { cn, fmt } from "@/lib/utils";

// Kept here (not imported from the schema) so the database code stays out of the browser bundle.
const TICKET_TYPES: TicketType[] = ["question", "order", "complaint", "return", "warranty", "other"];

type Defaults = { name?: string; email?: string; phone?: string };

/** Contact form: every message becomes a support ticket the team answers from the dashboard. */
export function SupportForm({ locale, d, defaults = {} }: { locale: Locale; d: Dict["support"]; defaults?: Defaults }) {
  const [pending, start] = useTransition();
  const [bad, setBad] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: string; token: string } | null>(null);
  const [type, setType] = useState<TicketType>("question");

  if (done)
    return (
      <div role="status" className="rounded-3xl border border-ok/40 bg-ok-50 p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto h-10 w-10 text-ok" aria-hidden="true" />
        <p className="mt-3 text-lg font-bold">{d.sent}</p>
        <p className="mt-2 text-sm text-fg-2">{fmt(d.sentText, { number: done.number })}</p>
        <Link href={localePath(locale, `/support/${done.number}?t=${done.token}`)} className="btn btn-brand mt-5">{d.viewTicket}</Link>
      </div>
    );

  const field = (name: string) => cn("input", bad.includes(name) && "!border-hot");
  return (
    <form
      className="grid gap-4 rounded-3xl border border-line bg-surface p-5 sm:grid-cols-2 sm:p-7"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const v = (k: string) => String(f.get(k) ?? "");
        setError(null);
        start(async () => {
          const r = await createTicket({ name: v("name"), email: v("email"), phone: v("phone"), type, orderNumber: v("orderNumber"), subject: v("subject"), message: v("message"), locale });
          if (r.ok) return setDone({ number: r.number, token: r.token });
          setBad(r.fields ?? []);
          setError(r.error === "invalid" ? d.invalid : r.error === "rate" ? d.rate : d.error);
        });
      }}
    >
      <div className="sm:col-span-2">
        <h2 className="text-lg font-bold">{d.formTitle}</h2>
        <p className="mt-1 text-sm text-muted">{d.formText}</p>
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="label">{d.type}</legend>
        <div className="flex flex-wrap gap-2">
          {TICKET_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)} aria-pressed={type === t} className={cn("btn btn-sm", type === t ? "btn-brand" : "btn-outline")}>
              {d.types[t]}
            </button>
          ))}
        </div>
      </fieldset>
      <div><label className="label" htmlFor="s-name">{d.name}</label><input id="s-name" name="name" required minLength={2} maxLength={80} autoComplete="name" defaultValue={defaults.name} className={field("name")} /></div>
      <div><label className="label" htmlFor="s-email">{d.email}</label><input id="s-email" name="email" type="email" required maxLength={120} autoComplete="email" inputMode="email" dir="ltr" defaultValue={defaults.email} className={field("email")} /></div>
      <div><label className="label" htmlFor="s-phone">{d.phone}</label><input id="s-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" inputMode="tel" dir="ltr" defaultValue={defaults.phone} className={field("phone")} /></div>
      <div><label className="label" htmlFor="s-order">{d.orderNumber}</label><input id="s-order" name="orderNumber" maxLength={20} dir="ltr" placeholder="ES-10001" className={field("orderNumber")} /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="s-subject">{d.subject}</label><input id="s-subject" name="subject" required minLength={3} maxLength={140} className={field("subject")} /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="s-message">{d.message}</label><textarea id="s-message" name="message" required minLength={10} maxLength={5000} rows={5} className={field("message")} /></div>
      {error && <p role="alert" className="text-sm font-medium text-hot sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className="btn btn-brand btn-lg w-full sm:w-auto">
          <Send className="h-4.5 w-4.5 rtl:-scale-x-100" aria-hidden="true" />
          {pending ? d.sending : d.send}
        </button>
      </div>
    </form>
  );
}
