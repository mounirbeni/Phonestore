"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { saveAdminNote, updateOrderStatus } from "@/app/actions/admin";
import { ORDER_STATUSES, type OrderStatus } from "@/db/schema";
import { statusLabel } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

export function OrderActions({ id, status, note }: { id: number; status: OrderStatus; note: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState(note);
  const [saved, setSaved] = useState(false);

  function change(next: OrderStatus) {
    if (next === status) return;
    if (next === "cancelled" && !confirm("إلغاء الطلب سيعيد الكميات إلى المخزون. هل أنت متأكد؟")) return;
    setError(null);
    start(async () => {
      const r = await updateOrderStatus(id, next);
      if (!r.ok) setError(r.error ?? "تعذّر التحديث");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-3 font-bold">تغيير الحالة</h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending}
              onClick={() => change(s)}
              aria-pressed={s === status}
              className={cn("btn btn-sm", s === status ? "btn-primary" : "btn-outline", s === "cancelled" && s !== status && "!text-hot")}
            >
              {statusLabel[s]}
            </button>
          ))}
        </div>
        {error && <p role="alert" className="mt-3 text-sm font-medium text-hot">{error}</p>}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-3 font-bold">ملاحظة داخلية</h2>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          rows={3}
          maxLength={2000}
          className="input"
          placeholder="ملاحظات خاصة بالفريق (لا يراها العميل)"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            disabled={pending || text === note}
            className="btn btn-primary btn-sm"
            onClick={() =>
              start(async () => {
                await saveAdminNote(id, text);
                setSaved(true);
                router.refresh();
              })
            }
          >
            حفظ الملاحظة
          </button>
          {saved && <span className="text-sm text-ok">تم الحفظ</span>}
          <button type="button" onClick={() => window.print()} className="btn btn-outline btn-sm ms-auto">
            <Printer className="h-4 w-4" aria-hidden="true" />
            طباعة
          </button>
        </div>
      </section>
    </div>
  );
}
