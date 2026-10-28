"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import { assignDriver } from "@/app/actions/admin";
import { useT } from "@/components/admin/admin-lang";

export function DriverAssign({ orderId, driverId, drivers }: { orderId: number; driverId: number | null; drivers: { id: number; name: string; phone: string }[] }) {
  const T = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 text-sm">
      <h2 className="mb-3 flex items-center gap-2 font-bold"><Truck className="h-4.5 w-4.5 text-muted" aria-hidden="true" />{T("الموصّل")}</h2>
      {drivers.length === 0 ? (
        <p className="text-muted">{T("لا يوجد موصّلون بعد. يضيفهم المالك من صفحة «الفريق».")}</p>
      ) : (
        <select
          className="input !py-2"
          value={driverId ?? ""}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.value ? Number(e.target.value) : null;
            setError(null);
            start(async () => {
              const r = await assignDriver(orderId, v);
              if (!r.ok) setError(T(r.error ?? "تعذّر الإسناد"));
              else router.refresh();
            });
          }}
        >
          <option value="">{T("— غير مسند —")}</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>{d.name}{d.phone ? ` · ${d.phone}` : ""}</option>
          ))}
        </select>
      )}
      {error && <p role="alert" className="mt-2 text-hot">{error}</p>}
    </section>
  );
}
