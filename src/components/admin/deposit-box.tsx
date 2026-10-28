"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { setDepositPaid } from "@/app/actions/admin";
import type { OrderStatus } from "@/db/schema";
import { eur } from "@/lib/admin-ui";
import { useT } from "@/components/admin/admin-lang";

/** Payment panel of an order: the bank-transfer advance and what is left to collect on delivery. */
export function DepositBox({ orderId, deposit, paidAt, method, reference, due, status }: { orderId: number; deposit: number; paidAt: string | null; method: string; reference: string; due: number; status: OrderStatus }) {
  const T = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(paid: boolean) {
    if (!paid && !confirm(T("إلغاء تسجيل استلام التسبيق سيعيد الطلب إلى «قيد الانتظار». هل أنت متأكد؟"))) return;
    setError(null);
    start(async () => {
      const r = await setDepositPaid(orderId, paid);
      if (!r.ok) setError(T(r.error ?? "تعذّر التحديث"));
      else router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 text-sm">
      <h2 className="mb-3 flex items-center gap-2 font-bold"><Landmark className="h-4.5 w-4.5 text-muted" aria-hidden="true" />{T("الدفع")}</h2>
      {deposit > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <span>{T("التسبيق")}</span>
            <b dir="ltr">{eur(deposit)}</b>
          </div>
          {paidAt ? (
            <p className="mt-2 rounded-xl bg-ok/10 px-3 py-2 font-medium text-ok">{T("تم الاستلام")} {method === "card" ? T("بالبطاقة") : T("بالتحويل")} · {new Date(paidAt).toLocaleDateString(T.lang === "ar" ? "ar-u-nu-latn" : "fr-FR")}{reference && <span className="block text-xs font-normal" dir="ltr">{reference}</span>}</p>
          ) : (
            <p className="mt-2 rounded-xl bg-[#fff7e6] px-3 py-2 font-medium text-[#8a5300]">{T("بانتظار التسبيق — مرجع التحويل هو رقم الطلب")}</p>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span>{T("يُحصَّل عند الاستلام")}</span>
            <b dir="ltr">{eur(due)}</b>
          </div>
          {status !== "cancelled" &&
            (paidAt ? (
              status === "pending" || status === "confirmed" ? (
                <button type="button" disabled={pending} onClick={() => toggle(false)} className="btn btn-ghost btn-sm mt-3 w-full">{T("إلغاء تسجيل الاستلام")}</button>
              ) : null
            ) : (
              <button type="button" disabled={pending} onClick={() => toggle(true)} className="btn btn-primary btn-sm mt-3 w-full">{T("تأكيد استلام التسبيق")}</button>
            ))}
          {error && <p role="alert" className="mt-2 text-hot">{error}</p>}
        </>
      ) : (
        <p>{T("الدفع كاملًا عند الاستلام:")} <b dir="ltr">{eur(due)}</b></p>
      )}
    </section>
  );
}
