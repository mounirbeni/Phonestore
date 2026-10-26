"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { deleteCategory, saveCategory } from "@/app/actions/admin";

type Cat = { id?: number; nameFr: string; nameAr: string; slug: string; icon: string; sort: number; products?: number };
const ICONS: [string, string][] = [["phone", "هاتف"], ["tablet", "لوحي"], ["watch", "ساعة"], ["audio", "صوتيات"], ["laptop", "حاسوب"], ["accessory", "إكسسوار"]];

function Row({ cat }: { cat: Cat }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [c, setC] = useState(cat);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const isNew = !cat.id;

  function save() {
    start(async () => {
      const r = await saveCategory({ id: c.id, nameFr: c.nameFr, nameAr: c.nameAr, slug: c.slug, icon: c.icon as "phone", sort: c.sort });
      if (r.ok) {
        setMsg({ ok: true, text: "تم الحفظ" });
        if (isNew) setC({ nameFr: "", nameAr: "", slug: "", icon: "phone", sort: c.sort + 1 });
        router.refresh();
      } else setMsg({ ok: false, text: r.error ?? "خطأ" });
    });
  }

  return (
    <li className="grid items-end gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_9rem_5rem_auto]">
      <div><label className="label">الاسم (فرنسية)</label><input className="input !py-2" dir="ltr" value={c.nameFr} onChange={(e) => setC({ ...c, nameFr: e.target.value })} /></div>
      <div><label className="label">الاسم (عربية)</label><input className="input !py-2" value={c.nameAr} onChange={(e) => setC({ ...c, nameAr: e.target.value })} /></div>
      <div><label className="label">الرابط</label><input className="input !py-2" dir="ltr" value={c.slug} placeholder="تلقائي" onChange={(e) => setC({ ...c, slug: e.target.value })} /></div>
      <div>
        <label className="label">الأيقونة</label>
        <select className="input !py-2" value={c.icon} onChange={(e) => setC({ ...c, icon: e.target.value })}>
          {ICONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div><label className="label">الترتيب</label><input type="number" className="input !py-2" dir="ltr" value={c.sort} onChange={(e) => setC({ ...c, sort: Number(e.target.value) || 0 })} /></div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={save} disabled={pending || !c.nameFr || !c.nameAr} className="btn btn-primary btn-sm">{isNew ? "إضافة" : <Check className="h-4 w-4" />}</button>
        {!isNew && (
          <button
            type="button"
            disabled={pending}
            aria-label="حذف"
            className="grid h-9 w-9 place-items-center rounded-lg text-hot hover:bg-hot-50"
            onClick={() => {
              if (!confirm("حذف هذه الفئة؟")) return;
              start(async () => {
                const r = await deleteCategory(c.id!);
                if (r.ok) router.refresh();
                else setMsg({ ok: false, text: r.error ?? "خطأ" });
              });
            }}
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        )}
      </div>
      {msg && <p role="status" className={`sm:col-span-6 text-sm font-medium ${msg.ok ? "text-ok" : "text-hot"}`}>{msg.text}</p>}
      {!isNew && <p className="sm:col-span-6 -mt-1 text-xs text-muted">{cat.products ?? 0} منتج</p>}
    </li>
  );
}

export function CategoryManager({ cats }: { cats: Cat[] }) {
  return (
    <div className="space-y-6">
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {cats.map((c) => <Row key={c.id} cat={c} />)}
      </ul>
      <div>
        <h2 className="mb-2 font-bold">فئة جديدة</h2>
        <ul className="rounded-2xl border border-line bg-white">
          <Row cat={{ nameFr: "", nameAr: "", slug: "", icon: "phone", sort: cats.length }} />
        </ul>
      </div>
    </div>
  );
}
