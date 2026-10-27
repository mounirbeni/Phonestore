"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { deleteMember, saveMember, setMemberActive } from "@/app/actions/team";
import type { StaffRole } from "@/db/schema";
import { cn } from "@/lib/utils";

type Member = { id: number; name: string; email: string; phone: string; role: StaffRole; active: boolean; lastLoginAt: string | null };

const ROLES: { value: StaffRole; label: string; text: string }[] = [
  { value: "orders", label: "مسؤول الطلبات", text: "الطلبات والعملاء: التأكيد، الحالة، إسناد الموصّل." },
  { value: "catalog", label: "مسؤول المنتجات والمخزون", text: "المنتجات والأسعار والمخزون والفئات." },
  { value: "driver", label: "موصّل", text: "الطلبات المسندة إليه فقط: التسليم أو الرفض." },
];
const roleLabel = (r: StaffRole) => ROLES.find((x) => x.value === r)?.label ?? r;

const empty = { name: "", email: "", phone: "", role: "orders" as StaffRole, password: "" };

export function TeamManager({ members }: { members: Member[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<typeof empty & { id?: number }>(empty);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const edit = (m?: Member) => {
    setForm(m ? { id: m.id, name: m.name, email: m.email, phone: m.phone, role: m.role, password: "" } : empty);
    setMsg(null);
    setOpen(true);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveMember(form);
      if (!r.ok) return setMsg({ ok: false, text: r.error ?? "خطأ" });
      setMsg({ ok: true, text: "تم الحفظ" });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <ul className="grid gap-3 sm:grid-cols-3">
        {ROLES.map((r) => (
          <li key={r.value} className="rounded-2xl border border-line bg-white p-4 text-sm">
            <p className="font-bold">{r.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{r.text}</p>
          </li>
        ))}
      </ul>

      <div className="flex justify-end">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => edit()}><UserPlus className="h-4 w-4" />إضافة عضو</button>
      </div>

      {open && (
        <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">{form.id ? "تعديل العضو" : "عضو جديد"}</h2>
          <div><label className="label">الاسم</label><input className="input" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">الدور</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as StaffRole })}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div><label className="label">البريد الإلكتروني (للدخول)</label><input className="input" type="email" required dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="label">الهاتف</label><input className="input" type="tel" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <label className="label">{form.id ? "كلمة مرور جديدة (اتركها فارغة للإبقاء على الحالية)" : "كلمة المرور (8 أحرف على الأقل)"}</label>
            <input className="input" type="text" dir="ltr" autoComplete="new-password" minLength={form.id ? 0 : 8} required={!form.id} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {msg && !msg.ok && <p role="alert" className="text-sm font-medium text-hot sm:col-span-2">{msg.text}</p>}
          <div className="flex gap-2 sm:col-span-2">
            <button type="submit" disabled={pending} className="btn btn-primary">{pending ? "جارٍ الحفظ…" : "حفظ"}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>إلغاء</button>
          </div>
        </form>
      )}
      {msg?.ok && <p role="status" className="text-sm font-medium text-ok">{msg.text}</p>}

      {members.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-10 text-center text-sm text-muted">لا يوجد أعضاء بعد. أضف أول عضو في فريقك.</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {members.map((m) => (
            <li key={m.id} className={cn("flex flex-wrap items-center gap-3 p-4", !m.active && "opacity-60")}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mist font-bold">{m.name.slice(0, 1)}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{m.name} {!m.active && <span className="chip bg-hot-50 text-hot">موقوف</span>}</p>
                <p className="text-xs text-muted" dir="ltr" style={{ textAlign: "right" }}>{m.email}{m.phone ? ` · ${m.phone}` : ""}</p>
              </div>
              <span className="chip bg-mist text-ink-2">{roleLabel(m.role)}</span>
              <span className="w-full text-xs text-muted sm:w-auto">{m.lastLoginAt ? `آخر دخول ${new Date(m.lastLoginAt).toLocaleDateString("ar-u-nu-latn")}` : "لم يدخل بعد"}</span>
              <div className="flex items-center gap-1">
                <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={() => start(async () => { await setMemberActive(m.id, !m.active); router.refresh(); })}>
                  {m.active ? "إيقاف" : "تفعيل"}
                </button>
                <button type="button" aria-label="تعديل" className="grid h-9 w-9 place-items-center rounded-lg hover:bg-mist" onClick={() => edit(m)}><Pencil className="h-4 w-4" /></button>
                <button
                  type="button"
                  aria-label="حذف"
                  disabled={pending}
                  className="grid h-9 w-9 place-items-center rounded-lg text-hot hover:bg-hot-50"
                  onClick={() => {
                    if (!confirm(`حذف ${m.name}؟ يبقى اسمه في سجل الطلبات.`)) return;
                    start(async () => { await deleteMember(m.id); router.refresh(); });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
