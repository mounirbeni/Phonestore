"use client";

import { useState, useTransition } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { saveSerials } from "@/app/actions/warranty";
import { useT } from "@/components/admin/admin-lang";

type Item = { id: number; name: string; label: string; qty: number; serials: string[]; codes: string[] };

/** IMEI / serial number of each unit sold; each one carries its own digital warranty. */
export function SerialsEditor({ orderId, items, active }: { orderId: number; items: Item[]; active: boolean }) {
  const T = useT();
  const [vals, setVals] = useState(() => items.map((i) => Array.from({ length: i.qty }, (_, k) => i.serials[k] ?? "")));
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<boolean | null>(null);
  if (!items.length) return null;
  const save = () =>
    start(async () => {
      const r = await saveSerials({ orderId, lines: items.map((i, k) => ({ itemId: i.id, serials: vals[k] })) });
      setSaved(r.ok);
    });
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 text-sm">
      <h2 className="mb-1 flex items-center gap-2 font-bold"><ShieldCheck className="h-4.5 w-4.5 text-brand" aria-hidden="true" />{T("الضمان الرقمي")}</h2>
      <p className="mb-4 text-xs text-muted">{active ? T("يبدأ الضمان من تاريخ التسليم. أدخل IMEI أو الرقم التسلسلي لكل وحدة.") : T("الضمان يبدأ عند تسليم الطلب. يمكنك إدخال IMEI الآن.")}</p>
      <div className="space-y-4">
        {items.map((i, k) => (
          <div key={i.id}>
            <p className="font-semibold">{i.name}{i.label ? <span className="font-normal text-muted"> · {i.label}</span> : null}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {vals[k].map((v, j) => (
                <div key={j}>
                  <input
                    value={v}
                    onChange={(e) => {
                      setSaved(null);
                      setVals((all) => all.map((row, a) => (a === k ? row.map((x, b) => (b === j ? e.target.value : x)) : row)));
                    }}
                    className="input !h-10 font-mono uppercase"
                    dir="ltr"
                    maxLength={40}
                    placeholder={`IMEI / N° série${i.qty > 1 ? ` ${j + 1}` : ""}`}
                    aria-label={`IMEI ${i.name} ${j + 1}`}
                  />
                  {i.codes[j] && <a href={`/fr/garantie/${i.codes[j]}`} target="_blank" rel="noreferrer" className="mt-1 block font-mono text-xs text-muted hover:text-brand" dir="ltr">{i.codes[j]}</a>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary btn-sm">{pending ? T("جارٍ الحفظ…") : T("حفظ")}</button>
        {saved === true && <span className="flex items-center gap-1 text-ok"><Check className="h-4 w-4" aria-hidden="true" />{T("تم الحفظ")}</span>}
        {saved === false && <span className="text-hot">{T("تعذّر الحفظ")}</span>}
      </div>
    </section>
  );
}
