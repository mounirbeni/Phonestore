"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { customerReply } from "@/app/actions/support";
import type { Dict } from "@/lib/dictionary";

export function TicketReply({ number, token, d }: { number: string; token: string; d: Dict["support"] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await customerReply(number, token, text);
          if (r.ok) {
            setText("");
            setMsg({ ok: true, text: d.replySent });
            router.refresh();
          } else setMsg({ ok: false, text: r.error === "closed" ? d.closed : r.error === "rate" ? d.rate : d.invalid });
        });
      }}
    >
      <label className="label" htmlFor="reply">{d.reply}</label>
      <textarea id="reply" value={text} onChange={(e) => setText(e.target.value)} required minLength={2} maxLength={5000} rows={4} placeholder={d.replyPlaceholder} className="input" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || text.trim().length < 2} className="btn btn-brand"><Send className="h-4.5 w-4.5 rtl:-scale-x-100" aria-hidden="true" />{d.reply}</button>
        {msg && <span role={msg.ok ? "status" : "alert"} className={msg.ok ? "text-sm text-ok" : "text-sm text-hot"}>{msg.text}</span>}
      </div>
    </form>
  );
}
