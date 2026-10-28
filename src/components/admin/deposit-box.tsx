"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { setDepositPaid } from "@/app/actions/admin";
import type { OrderStatus } from "@/db/schema";
import { eur } from "@/lib/admin-ui";

/** Payment panel of an order: the bank-transfer advance and what is left to collect on delivery. */
export function DepositBox({ orderId, deposit, paidAt, due, status }: { orderId: number; deposit: number; paidAt: string | null; due: number; status: OrderStatus }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(paid: boolean) {
    if (!paid && !confirm("إلغاء تسجيل استلام التسبيق سيعيد الطلب إلى «قيد الانتظار». هل أنت متأكد؟")) return;
    setError(null);
    start(async () => {
      const r = await setDepositPaid(orderId, paid);
      if (!r.ok) setError(r.error ?? "تعذّر التحديث");
      else router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 text-sm">
      <h2 className="mb-3 flex items-center gap-2 font-bold"><Landmark className="h-4.5 w-4.5 text-muted" aria-hidden="true" />الدفع</h2>
      {deposit > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <span>تسبيق بالتحويل البنكي</span>
            <b dir="ltr">{eur(deposit)}</b>
          </div>
          {paidAt ? (
            <p className="mt-2 rounded-xl bg-ok/10 px-3 py-2 font-medium text-ok">تم الاستلام · {new Date(paidAt).toLocaleDateString("fr-FR")}</p>
          ) : (
            <p className="mt-2 rounded-xl bg-[#fff7e6] px-3 py-2 font-medium text-[#8a5300]">بانتظار التحويل — مرجع التحويل هو رقم الطلب</p>
          )}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <span>يُحصَّل عند الاستلام</span>
            <b dir="ltr">{eur(due)}</b>
          </div>
          {status !== "cancelled" &&
            (paidAt ? (
              status === "pending" || status === "confirmed" ? (
                <button type="button" disabled={pending} onClick={() => toggle(false)} className="btn btn-ghost btn-sm mt-3 w-full">إلغاء تسجيل الاستلام</button>
              ) : null
            ) : (
              <button type="button" disabled={pending} onClick={() => toggle(true)} className="btn btn-primary btn-sm mt-3 w-full">تأكيد استلام التسبيق</button>
            ))}
          {error && <p role="alert" className="mt-2 text-hot">{error}</p>}
        </>
      ) : (
        <p>الدفع كاملًا عند الاستلام: <b dir="ltr">{eur(due)}</b></p>
      )}
    </section>
  );
}
