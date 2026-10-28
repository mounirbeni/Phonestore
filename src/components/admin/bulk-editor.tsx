"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Save, Upload, Undo2 } from "lucide-react";
import { importVariantsCsv, saveVariantsBulk, type VariantChange } from "@/app/actions/bulk";
import { useT } from "@/components/admin/admin-lang";
import { cn } from "@/lib/utils";

type Shop = { id: number; name: string };
type Row = { id: number; sku: string; name: string; variant: string; productId: number; active: boolean; price: number; compareAt: number | null; qty: Record<number, number> };
type Draft = { price: string; compareAt: string; qty: Record<number, string> };

const toDh = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2).replace(/\.00$/, ""));
const cents = (s: string) => {
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return s.trim() === "" ? null : Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

/** Inline table: price, strike-through price and stock per shop; only changed rows are sent. */
export function BulkEditor({ rows, shops }: { rows: Row[]; shops: Shop[] }) {
  const T = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const initial = (r: Row): Draft => ({ price: toDh(r.price), compareAt: toDh(r.compareAt), qty: Object.fromEntries(shops.map((sh) => [sh.id, String(r.qty[sh.id] ?? 0)])) });
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() => Object.fromEntries(rows.map((r) => [r.id, initial(r)])));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const qtyChanged = (r: Row) => shops.filter((sh) => drafts[r.id].qty[sh.id] !== String(r.qty[sh.id] ?? 0));
  const changed = rows.filter((r) => {
    const d = drafts[r.id], i = initial(r);
    return d.price !== i.price || d.compareAt !== i.compareAt || qtyChanged(r).length > 0;
  });
  const invalid = changed.filter((r) => {
    const d = drafts[r.id];
    const p = cents(d.price), c = cents(d.compareAt);
    return p == null || Number.isNaN(p) || Number.isNaN(c) || shops.some((sh) => { const s = Number(d.qty[sh.id]); return !Number.isInteger(s) || s < 0; });
  });

  const set = (id: number, k: "price" | "compareAt", v: string) => {
    setMsg(null);
    setDrafts((d) => ({ ...d, [id]: { ...d[id], [k]: v } }));
  };
  const setQty = (id: number, shop: number, v: string) => {
    setMsg(null);
    setDrafts((d) => ({ ...d, [id]: { ...d[id], qty: { ...d[id].qty, [shop]: v } } }));
  };

  function save() {
    const payload: VariantChange[] = changed.map((r) => {
      const d = drafts[r.id];
      return { id: r.id, price: cents(d.price)!, compareAt: cents(d.compareAt), stocks: qtyChanged(r).map((sh) => ({ storeId: sh.id, qty: Number(d.qty[sh.id]) })) };
    });
    start(async () => {
      const r = await saveVariantsBulk(payload);
      if (!r.ok) return setMsg({ ok: false, text: T(r.error ?? "خطأ") });
      setMsg({ ok: true, text: T("تم حفظ {n} تعديل", { n: r.updated ?? 0 }) });
      router.refresh();
    });
  }

  if (!rows.length) return <p className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-sm text-muted">{T("لا توجد منتجات")}</p>;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line bg-mist/60">
              <th className="px-4 py-3 text-start font-medium">{T("المنتج")}</th>
              <th className="px-2 py-3 text-start font-medium">SKU</th>
              <th className="w-28 px-2 py-3 text-start font-medium">{T("السعر (DH)")}</th>
              <th className="w-28 px-2 py-3 text-start font-medium">{T("السعر قبل التخفيض (DH)")}</th>
              {shops.map((sh) => <th key={sh.id} className="w-24 px-2 py-3 text-start font-medium">{T("المخزون")} · {sh.name}</th>)}
              <th className="w-14 px-4 py-3 text-start font-medium">{T("المجموع")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const d = drafts[r.id];
              const dirty = changed.includes(r);
              const bad = invalid.includes(r);
              const total = shops.reduce((n, sh) => n + (Number(d.qty[sh.id]) || 0), 0);
              return (
                <tr key={r.id} className={cn("transition", dirty ? "bg-brand/5" : "hover:bg-mist/40")}>
                  <td className="px-4 py-2">
                    <Link href={`/admin/products/${r.productId}`} className="line-clamp-1 font-medium hover:text-brand">{r.name}</Link>
                    <span className="text-xs text-muted">{r.variant || "—"}{!r.active && ` · ${T("مخفي")}`}</span>
                  </td>
                  <td className="px-2 py-2 font-mono text-xs text-muted" dir="ltr">{r.sku}</td>
                  <td className="px-2 py-2"><input value={d.price} onChange={(e) => set(r.id, "price", e.target.value)} inputMode="decimal" dir="ltr" className={cn("input !py-1.5 text-sm tabular-nums", bad && "!border-hot")} aria-label={`${T("السعر (DH)")} — ${r.name}`} /></td>
                  <td className="px-2 py-2"><input value={d.compareAt} onChange={(e) => set(r.id, "compareAt", e.target.value)} inputMode="decimal" dir="ltr" placeholder="—" className="input !py-1.5 text-sm tabular-nums" aria-label={`${T("السعر قبل التخفيض (DH)")} — ${r.name}`} /></td>
                  {shops.map((sh) => {
                    const q = Number(d.qty[sh.id]);
                    return (
                      <td key={sh.id} className="px-2 py-2">
                        <input value={d.qty[sh.id]} onChange={(e) => setQty(r.id, sh.id, e.target.value)} inputMode="numeric" dir="ltr" className={cn("input !py-1.5 text-sm tabular-nums", q === 0 && "!text-hot", q > 0 && q <= 3 && "!text-warn")} aria-label={`${T("المخزون")} ${sh.name} — ${r.name}`} />
                      </td>
                    );
                  })}
                  <td className="px-4 py-2 font-semibold tabular-nums" dir="ltr">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className={cn("sticky bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur transition lg:bottom-4", !changed.length && !msg && "opacity-0 pointer-events-none")}>
        <span className="text-sm">{changed.length ? T("{n} تعديل غير محفوظ", { n: changed.length }) : null}</span>
        {msg && <span role="status" className={cn("text-sm font-medium", msg.ok ? "text-ok" : "text-hot")}>{msg.text}</span>}
        {invalid.length > 0 && <span className="text-sm text-hot">{T("تحقق من الحقول باللون الأحمر")}</span>}
        <span className="ms-auto flex flex-wrap justify-end gap-2">
          <button type="button" disabled={pending || !changed.length} onClick={() => { setDrafts(Object.fromEntries(rows.map((r) => [r.id, initial(r)]))); setMsg(null); }} className="btn btn-ghost btn-sm"><Undo2 className="h-4 w-4" />{T("تراجع")}</button>
          <button type="button" disabled={pending || !changed.length || invalid.length > 0} onClick={save} className="btn btn-brand btn-sm"><Save className="h-4 w-4" />{pending ? T("جارٍ الحفظ…") : T("حفظ التعديلات")}</button>
        </span>
      </div>
    </div>
  );
}

/** Export the whole catalogue's prices and stock to a CSV, and import it back after editing in Excel. */
export function BulkFileTools() {
  const T = useT();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {msg && <span role="status" className={cn("text-sm font-medium", msg.ok ? "text-ok" : "text-hot")}>{msg.text}</span>}
      <a href="/api/admin/variants" className="btn btn-outline btn-sm"><Download className="h-4 w-4" aria-hidden="true" />{T("تصدير Excel")}</a>
      <button type="button" disabled={pending} onClick={() => input.current?.click()} className="btn btn-outline btn-sm"><Upload className="h-4 w-4" aria-hidden="true" />{pending ? T("جارٍ الاستيراد…") : T("استيراد ملف")}</button>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setMsg(null);
          start(async () => {
            const r = await importVariantsCsv(await file.text());
            if (!r.ok) return setMsg({ ok: false, text: T(r.error ?? "خطأ") });
            setMsg({ ok: true, text: T("تم تحديث {n} خيار، وتُرك {m} سطر", { n: r.updated ?? 0, m: r.skipped ?? 0 }) });
            router.refresh();
          });
        }}
      />
    </div>
  );
}
