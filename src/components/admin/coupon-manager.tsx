"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCoupon, saveCoupon, setCouponActive } from "@/app/actions/admin";
import { cn } from "@/lib/utils";
import { useT } from "@/components/admin/admin-lang";

type C = { id: number; code: string; label: string; minSubtotal: string; usedCount: number; maxUses: number | null; active: boolean };

export function CouponManager({ coupons }: { coupons: C[] }) {
  const T = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({ code: "", kind: "percent" as "percent" | "amount", value: "", min: "0", max: "" });
  const [error, setError] = useState<string | null>(null);

  function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await saveCoupon({
        code: form.code,
        kind: form.kind,
        value: Number(form.value.replace(",", ".")),
        minSubtotal: Number(form.min.replace(",", ".")) || 0,
        maxUses: form.max ? Number(form.max) : null,
      });
      if (!r.ok) return setError(T(r.error ?? "خطأ"));
      setForm({ code: "", kind: "percent", value: "", min: "0", max: "" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid items-end gap-3 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-[1.2fr_8rem_1fr_1fr_1fr_auto]">
        <div><label className="label">{T("الكود")}</label><input required className="input !py-2 uppercase" dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="WELCOME10" /></div>
        <div>
          <label className="label">{T("النوع")}</label>
          <select className="input !py-2" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "percent" | "amount" })}>
            <option value="percent">{T("نسبة %")}</option>
            <option value="amount">{T("مبلغ DH")}</option>
          </select>
        </div>
        <div><label className="label">{T("القيمة")}</label><input required className="input !py-2" inputMode="decimal" dir="ltr" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></div>
        <div><label className="label">{T("حد أدنى للطلب (DH)")}</label><input className="input !py-2" inputMode="decimal" dir="ltr" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} /></div>
        <div><label className="label">{T("أقصى استخدام")}</label><input className="input !py-2" inputMode="numeric" dir="ltr" value={form.max} placeholder={T("غير محدود")} onChange={(e) => setForm({ ...form, max: e.target.value })} /></div>
        <button type="submit" disabled={pending} className="btn btn-brand btn-sm">{T("إضافة")}</button>
        {error && <p role="alert" className="text-sm font-medium text-hot sm:col-span-6">{error}</p>}
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line bg-mist/60">
              <th className="px-5 py-2.5 text-start font-medium">{T("الكود")}</th>
              <th className="px-3 py-2.5 text-start font-medium">{T("الخصم")}</th>
              <th className="px-3 py-2.5 text-start font-medium">{T("الحد الأدنى")}</th>
              <th className="px-3 py-2.5 text-start font-medium">{T("الاستخدام")}</th>
              <th className="px-3 py-2.5 text-start font-medium">{T("الحالة")}</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-3 font-mono font-semibold" dir="ltr" style={{ textAlign: T.lang === "ar" ? "right" : "left" }}>{c.code}</td>
                <td className="px-3 py-3" dir="ltr" style={{ textAlign: T.lang === "ar" ? "right" : "left" }}>{c.label}</td>
                <td className="px-3 py-3" dir="ltr" style={{ textAlign: T.lang === "ar" ? "right" : "left" }}>{c.minSubtotal}</td>
                <td className="px-3 py-3 tabular-nums">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                <td className="px-3 py-3">
                  <button type="button" disabled={pending} onClick={() => start(async () => { await setCouponActive(c.id, !c.active); router.refresh(); })} className={cn("chip cursor-pointer", c.active ? "bg-ok-50 text-ok" : "bg-mist text-muted")}>
                    {c.active ? T("مفعّل") : T("متوقف")}
                  </button>
                </td>
                <td className="px-3 py-3 text-end">
                  <button type="button" aria-label={T("حذف")} disabled={pending} onClick={() => confirm(T("حذف هذا الكود؟")) && start(async () => { await deleteCoupon(c.id); router.refresh(); })} className="grid h-9 w-9 place-items-center rounded-lg text-hot hover:bg-hot-50">
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">{T("لا توجد أكواد خصم")}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
