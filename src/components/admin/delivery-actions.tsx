"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquarePlus, X } from "lucide-react";
import { driverUpdate } from "@/app/actions/admin";

export function DeliveryActions({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function act(action: "delivered" | "refused" | "note") {
    if (action === "refused" && !confirm("تأكيد أن العميل رفض الاستلام؟ سيُلغى الطلب ويعود المنتج إلى المخزون.")) return;
    setError(null);
    start(async () => {
      const r = await driverUpdate(orderId, action, note);
      if (!r.ok) return setError(r.error ?? "تعذّر التحديث");
      setNote("");
      setDone(action === "note" ? "سُجّلت الملاحظة" : null);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-2 border-t border-line pt-4">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={pending} onClick={() => act("delivered")} className="btn bg-ok text-white hover:opacity-90"><Check className="h-4.5 w-4.5" />تم التسليم</button>
        <button type="button" disabled={pending} onClick={() => act("refused")} className="btn btn-outline !border-hot !text-hot"><X className="h-4.5 w-4.5" />رفض الاستلام</button>
      </div>
      <div className="flex gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="ملاحظة: لم يرد، موعد آخر…" className="input !py-2 text-sm" />
        <button type="button" disabled={pending || !note.trim()} onClick={() => act("note")} className="btn btn-ghost btn-sm shrink-0" aria-label="تسجيل الملاحظة"><MessageSquarePlus className="h-4.5 w-4.5" /></button>
      </div>
      {error && <p role="alert" className="text-sm text-hot">{error}</p>}
      {done && <p role="status" className="text-sm text-ok">{done}</p>}
    </div>
  );
}
