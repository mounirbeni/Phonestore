"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { deleteCategory, saveCategory } from "@/app/actions/admin";
import { CATEGORY_ICONS } from "@/lib/category-icons";
import { useT } from "@/components/admin/admin-lang";

type Cat = { id?: number; nameFr: string; nameAr: string; slug: string; icon: string; sort: number; parentId: number | null; products?: number; children?: number };
type Family = { id: number; nameFr: string; nameAr: string };

function Row({ cat, families }: { cat: Cat; families: Family[] }) {
  const T = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [c, setC] = useState(cat);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const isNew = !cat.id;

  function save() {
    start(async () => {
      const r = await saveCategory({ id: c.id, nameFr: c.nameFr, nameAr: c.nameAr, slug: c.slug, icon: c.icon, sort: c.sort, parentId: c.parentId });
      if (r.ok) {
        setMsg({ ok: true, text: T("تم الحفظ") });
        if (isNew) setC({ nameFr: "", nameAr: "", slug: "", icon: "phone", sort: c.sort + 1, parentId: c.parentId });
        router.refresh();
      } else setMsg({ ok: false, text: T(r.error ?? "خطأ") });
    });
  }

  return (
    <li className={`grid items-end gap-3 p-4 sm:grid-cols-[1fr_1fr_1fr_10rem_10rem_5rem_auto] ${cat.parentId ? "bg-mist/40 sm:ps-10" : ""}`}>
      <div><label className="label">{T("الاسم (فرنسية)")}</label><input className="input !py-2" dir="ltr" value={c.nameFr} onChange={(e) => setC({ ...c, nameFr: e.target.value })} /></div>
      <div><label className="label">{T("الاسم (عربية)")}</label><input className="input !py-2" value={c.nameAr} onChange={(e) => setC({ ...c, nameAr: e.target.value })} /></div>
      <div><label className="label">{T("الرابط")}</label><input className="input !py-2" dir="ltr" value={c.slug} placeholder={T("تلقائي")} onChange={(e) => setC({ ...c, slug: e.target.value })} /></div>
      <div>
        <label className="label">{T("الأيقونة")}</label>
        <select className="input !py-2" value={c.icon} onChange={(e) => setC({ ...c, icon: e.target.value })}>
          {CATEGORY_ICONS.map(([v, l]) => <option key={v} value={v}>{T(l)}</option>)}
        </select>
      </div>
      <div>
        <label className="label">{T("تابعة لـ")}</label>
        <select className="input !py-2" value={c.parentId ?? ""} onChange={(e) => setC({ ...c, parentId: e.target.value ? Number(e.target.value) : null })}>
          <option value="">{T("— فئة رئيسية —")}</option>
          {families.filter((f) => f.id !== c.id).map((f) => <option key={f.id} value={f.id}>{T.lang === "fr" ? f.nameFr : f.nameAr}</option>)}
        </select>
      </div>
      <div><label className="label">{T("الترتيب")}</label><input type="number" className="input !py-2" dir="ltr" value={c.sort} onChange={(e) => setC({ ...c, sort: Number(e.target.value) || 0 })} /></div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={save} disabled={pending || !c.nameFr || !c.nameAr} className="btn btn-primary btn-sm">{isNew ? T("إضافة") : <Check className="h-4 w-4" />}</button>
        {!isNew && (
          <button
            type="button"
            disabled={pending}
            aria-label={T("حذف")}
            className="grid h-9 w-9 place-items-center rounded-lg text-hot hover:bg-hot-50"
            onClick={() => {
              if (!confirm(T("حذف هذه الفئة؟"))) return;
              start(async () => {
                const r = await deleteCategory(c.id!);
                if (r.ok) router.refresh();
                else setMsg({ ok: false, text: T(r.error ?? "خطأ") });
              });
            }}
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        )}
      </div>
      {msg && <p role="status" className={`sm:col-span-7 text-sm font-medium ${msg.ok ? "text-ok" : "text-hot"}`}>{msg.text}</p>}
      {!isNew && <p className="sm:col-span-7 -mt-1 text-xs text-muted">{cat.children ? T("{n} فئة فرعية", { n: cat.children }) : T("{n} منتج", { n: cat.products ?? 0 })}</p>}
    </li>
  );
}

export function CategoryManager({ cats }: { cats: Cat[] }) {
  const T = useT();
  const tops = cats.filter((c) => c.parentId == null);
  // Families that already hold products directly can't take sub-categories, so they aren't offered as parents.
  const families = tops.filter((c) => !c.products || c.children).map((c) => ({ id: c.id!, nameFr: c.nameFr, nameAr: c.nameAr }));
  const ordered = tops.flatMap((t) => [t, ...cats.filter((c) => c.parentId === t.id)]);
  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-white p-4 text-sm leading-relaxed text-muted">
        {T("التصنيف على مستويين: فئة رئيسية (مثل «الأجهزة المنزلية») ثم فئات فرعية دقيقة (مثل «الثلاجات»).")}{" "}
        {T("تُضاف المنتجات إلى الفئة الفرعية فقط، فلا تظهر في أي فئة غير ما يخصّها. الفئات الفارغة تُخفى تلقائيًا من المتجر.")}
      </p>
      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {ordered.map((c) => <Row key={c.id} cat={c} families={families} />)}
      </ul>
      <div>
        <h2 className="mb-2 font-bold">{T("فئة جديدة")}</h2>
        <ul className="rounded-2xl border border-line bg-white">
          <Row cat={{ nameFr: "", nameAr: "", slug: "", icon: "phone", sort: cats.length, parentId: null }} families={families} />
        </ul>
      </div>
    </div>
  );
}
