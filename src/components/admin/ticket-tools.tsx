"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Send } from "lucide-react";
import { staffReply, updateTicket } from "@/app/actions/support";
import type { TicketStatus } from "@/db/schema";
import { ticketStatusLabel } from "@/lib/support-ui";
import { cn } from "@/lib/utils";
import { useT } from "@/components/admin/admin-lang";

const STATUSES: TicketStatus[] = ["new", "open", "waiting", "resolved", "closed"];

/** Reply box: an answer goes to the customer (by e-mail and on their ticket page), a note stays inside the team. */
export function TicketComposer({ ticketId, closed }: { ticketId: number; closed: boolean }) {
  const T = useT();
  const router = useRouter();
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className={cn("rounded-2xl border p-4", internal ? "border-warn/40 bg-warn-50" : "border-line bg-surface")}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await staffReply(ticketId, text, internal);
          if (!r.ok) return setError(T(r.error ?? "خطأ"));
          setText("");
          router.refresh();
        });
      }}
    >
      <div className="mb-3 flex gap-1 rounded-xl bg-mist p-1 text-sm">
        <button type="button" onClick={() => setInternal(false)} className={cn("flex-1 rounded-lg px-3 py-1.5 font-medium", !internal ? "bg-brand text-white" : "text-ink-2")}>{T("رد على العميل")}</button>
        <button type="button" onClick={() => setInternal(true)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-medium", internal ? "bg-warn text-bg" : "text-ink-2")}><Lock className="h-3.5 w-3.5" />{T("ملاحظة داخلية")}</button>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={5000} required className="input" placeholder={internal ? T("ملاحظة للفريق فقط، لا يراها العميل") : T("اكتب ردك للعميل…")} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || text.trim().length < 2} className={cn("btn btn-sm", internal ? "btn-outline" : "btn-brand")}>
          {internal ? <Lock className="h-4 w-4" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}
          {internal ? T("حفظ الملاحظة") : T("إرسال الرد")}
        </button>
        {!internal && <span className="text-xs text-muted">{closed ? T("التذكرة مغلقة: سيبقى الرد مسجّلًا") : T("يصل الرد إلى بريد العميل وصفحة متابعة طلبه")}</span>}
        {error && <span role="alert" className="text-sm text-hot">{error}</span>}
      </div>
    </form>
  );
}

/** Status, priority and assignee of a ticket. */
export function TicketControls({ ticketId, status, priority, assigneeId, team }: { ticketId: number; status: TicketStatus; priority: "normal" | "high"; assigneeId: number | null; team: { id: number; name: string }[] }) {
  const T = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (patch: Parameters<typeof updateTicket>[1]) =>
    start(async () => {
      setError(null);
      const r = await updateTicket(ticketId, patch);
      if (!r.ok) setError(T(r.error ?? "خطأ"));
      else router.refresh();
    });
  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="label">{T("الحالة")}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {STATUSES.map((s) => (
            <button key={s} type="button" disabled={pending} onClick={() => run({ status: s })} aria-pressed={s === status} className={cn("btn btn-sm", s === status ? "btn-brand" : "btn-outline")}>{T(ticketStatusLabel[s])}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="label">{T("الأولوية")}</p>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" disabled={pending} onClick={() => run({ priority: "normal" })} className={cn("btn btn-sm", priority === "normal" ? "btn-primary" : "btn-outline")}>{T("عادية")}</button>
          <button type="button" disabled={pending} onClick={() => run({ priority: "high" })} className={cn("btn btn-sm", priority === "high" ? "btn-brand" : "btn-outline")}>{T("عالية")}</button>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="assignee">{T("المسؤول")}</label>
        <select id="assignee" className="input !py-2" disabled={pending} value={assigneeId ?? ""} onChange={(e) => run({ assigneeId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">{T("— غير مسندة —")}</option>
          {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {team.length === 0 && <p className="mt-1.5 text-xs text-muted">{T("أضف أعضاء «فريق الدعم» من صفحة «الفريق».")}</p>}
      </div>
      {error && <p role="alert" className="text-hot">{error}</p>}
    </div>
  );
}
