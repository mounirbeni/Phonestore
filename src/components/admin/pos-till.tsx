"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Camera, CheckCircle2, CreditCard, FileText, Landmark, Minus, Plus, Printer, ScanLine, Search, Trash2, X } from "lucide-react";
import { posSale, posSearch, type PosHit } from "@/app/actions/pos";
import { useT } from "@/components/admin/admin-lang";
import { eur } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

type Line = PosHit & { n: number; serials: string[] };
type Payment = "cash" | "card" | "transfer";

const dh = (s: string) => Math.max(0, Math.round((parseFloat(s.replace(",", ".")) || 0) * 100));

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (o?: { formats?: string[] }) => Detector;

/** Phone / tablet camera barcode reader (BarcodeDetector, Chrome on Android and recent Safari). */
function CameraScan({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const T = useT();
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setErr(T("قارئ الكاميرا غير مدعوم في هذا المتصفح. استعمل قارئ الباركود أو اكتب الرمز."));
      return;
    }
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let done = false;
    const detector = new Ctor({ formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (!video.current) return;
        video.current.srcObject = s;
        void video.current.play();
        timer = setInterval(async () => {
          if (done || !video.current || video.current.readyState < 2) return;
          const [hit] = await detector.detect(video.current).catch(() => []);
          if (hit?.rawValue) {
            done = true;
            onCode(hit.rawValue);
          }
        }, 250);
      })
      .catch(() => setErr(T("تعذّر فتح الكاميرا. تحقق من الإذن.")));
    return () => {
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={T("مسح بالكاميرا")}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="flex items-center gap-2 font-bold"><ScanLine className="h-4.5 w-4.5 text-brand" aria-hidden="true" />{T("مسح بالكاميرا")}</p>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-mist" aria-label={T("إلغاء")}><X className="h-4.5 w-4.5" /></button>
        </div>
        {err ? <p className="p-5 text-sm text-hot">{err}</p> : <video ref={video} className="aspect-[4/3] w-full bg-black object-cover" muted playsInline />}
      </div>
    </div>
  );
}

export function PosTill({ storeId, storeName }: { storeId: number; storeName: string }) {
  const T = useT();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PosHit[]>([]);
  const [searching, startSearch] = useTransition();
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [payment, setPayment] = useState<Payment>("cash");
  const [received, setReceived] = useState("");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<{ id: number; number: string; total: number; change: number } | null>(null);
  const [scan, setScan] = useState(false);
  const [saving, startSave] = useTransition();

  const subtotal = lines.reduce((s, l) => s + l.price * l.n, 0);
  const off = Math.min(dh(discount), subtotal);
  const total = subtotal - off;
  const cash = dh(received);
  const change = payment === "cash" && cash > total ? cash - total : 0;

  function add(h: PosHit) {
    setMsg(null);
    setLines((ls) => {
      const cur = ls.find((l) => l.variantId === h.variantId);
      if (cur) {
        if (cur.n >= h.qty) {
          setMsg(T("لا توجد كمية إضافية في هذا المتجر"));
          return ls;
        }
        return ls.map((l) => (l === cur ? { ...l, n: l.n + 1, serials: [...l.serials, ""] } : l));
      }
      if (h.qty <= 0) {
        setMsg(T("غير متوفر في هذا المتجر"));
        return ls;
      }
      return [...ls, { ...h, n: 1, serials: [""] }];
    });
    setQ("");
    setHits([]);
    input.current?.focus();
  }

  function search(term: string, auto: boolean) {
    if (term.trim().length < 2) {
      setHits([]);
      return;
    }
    startSearch(async () => {
      const r = await posSearch(term, storeId);
      // A scanned code that matches exactly one item goes straight into the cart.
      const exact = r.filter((h) => h.barcode === term.trim() || h.sku.toLowerCase() === term.trim().toLowerCase());
      if (auto && exact.length === 1) add(exact[0]);
      else setHits(r);
    });
  }

  // Name search as you type; a scanner's Enter is handled right away.
  useEffect(() => {
    const t = setTimeout(() => search(q, false), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const setN = (id: number, n: number) =>
    setLines((ls) =>
      ls.flatMap((l) => (l.variantId !== id ? [l] : n <= 0 ? [] : [{ ...l, n: Math.min(n, l.qty), serials: Array.from({ length: Math.min(n, l.qty) }, (_, k) => l.serials[k] ?? "") }])),
    );
  const setSerial = (id: number, k: number, v: string) => setLines((ls) => ls.map((l) => (l.variantId === id ? { ...l, serials: l.serials.map((s, j) => (j === k ? v : s)) } : l)));

  function reset() {
    setLines([]);
    setDiscount("");
    setReceived("");
    setCustomer("");
    setPhone("");
    setPayment("cash");
    setDone(null);
    setMsg(null);
    input.current?.focus();
  }

  function checkout() {
    setMsg(null);
    if (!lines.length) return;
    if (payment === "cash" && received && cash < total) {
      setMsg(T("المبلغ المستلم أقل من المجموع"));
      return;
    }
    startSave(async () => {
      const r = await posSale({
        storeId,
        lines: lines.map((l) => ({ variantId: l.variantId, qty: l.n, serials: l.serials })),
        discount: off,
        payment,
        received: cash,
        customerName: customer,
        phone,
      });
      if (r.ok) {
        setDone({ id: r.id, number: r.number, total, change });
        router.refresh();
      } else if (r.error === "stock") setMsg(T("الكمية غير متوفرة: {name}", { name: r.name ?? "" }));
      else if (r.error === "store") setMsg(T("لا يمكنك البيع من هذا المتجر"));
      else if (r.error === "discount") setMsg(T("الخصم أكبر من المجموع"));
      else setMsg(T("تحقق من البيانات"));
    });
  }

  const PAY: { k: Payment; label: string; icon: typeof Banknote }[] = [
    { k: "cash", label: "نقدًا", icon: Banknote },
    { k: "card", label: "بطاقة", icon: CreditCard },
    { k: "transfer", label: "تحويل", icon: Landmark },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <div className="min-w-0 space-y-4">
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                ref={input}
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    search(q, true);
                  }
                }}
                placeholder={T("امسح الباركود أو اكتب اسم المنتج أو SKU")}
                className="input !h-12 !ps-11 text-base"
                aria-label={T("بحث عن منتج")}
                autoComplete="off"
              />
            </div>
            <button type="button" onClick={() => setScan(true)} className="btn btn-outline !h-12 shrink-0" aria-label={T("مسح بالكاميرا")}>
              <Camera className="h-5 w-5" aria-hidden="true" />
              <span className="max-sm:hidden">{T("الكاميرا")}</span>
            </button>
          </div>
          {(hits.length > 0 || (searching && q.length >= 2)) && (
            <ul className="absolute inset-x-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-2xl">
              {hits.length === 0 && <li className="px-3 py-3 text-sm text-muted">{T("جارٍ البحث…")}</li>}
              {hits.map((h) => (
                <li key={h.variantId}>
                  <button type="button" onClick={() => add(h)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-mist">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{h.name}</span>
                      <span className="block truncate text-xs text-muted" dir="ltr" style={{ textAlign: "start" }}>{[h.label, h.sku].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className={cn("chip shrink-0", h.qty > 0 ? "bg-ok-50 text-ok" : "bg-hot-50 text-hot")}>{h.qty}</span>
                    <span className="shrink-0 text-sm font-bold tabular-nums" dir="ltr">{eur(h.price)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {lines.length === 0 ? (
            <div className="grid place-items-center px-6 py-16 text-center text-sm text-muted">
              <ScanLine className="mb-3 h-10 w-10 text-line" aria-hidden="true" />
              {T("امسح منتجًا أو ابحث عنه لإضافته إلى البيع")}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {lines.map((l) => (
                <li key={l.variantId} className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{l.name}</p>
                      <p className="truncate text-xs text-muted">{[l.label, l.sku].filter(Boolean).join(" · ")} · {eur(l.price)}</p>
                    </div>
                    <div className="flex items-center rounded-xl border border-line">
                      <button type="button" onClick={() => setN(l.variantId, l.n - 1)} className="grid h-9 w-9 place-items-center" aria-label="-"><Minus className="h-4 w-4" /></button>
                      <span className="w-8 text-center font-bold tabular-nums">{l.n}</span>
                      <button type="button" onClick={() => setN(l.variantId, l.n + 1)} disabled={l.n >= l.qty} className="grid h-9 w-9 place-items-center disabled:opacity-40" aria-label="+"><Plus className="h-4 w-4" /></button>
                    </div>
                    <span className="w-24 text-end font-bold tabular-nums" dir="ltr">{eur(l.price * l.n)}</span>
                    <button type="button" onClick={() => setN(l.variantId, 0)} className="grid h-9 w-9 place-items-center rounded-full text-hot hover:bg-hot-50" aria-label={T("حذف")}><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {l.warrantyMonths > 0 && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {l.serials.map((s, k) => (
                        <input
                          key={k}
                          value={s}
                          onChange={(e) => setSerial(l.variantId, k, e.target.value)}
                          className="input !h-10 font-mono text-sm uppercase"
                          dir="ltr"
                          maxLength={40}
                          placeholder={l.n > 1 ? `IMEI / N° série ${k + 1}` : "IMEI / N° série"}
                          aria-label={`IMEI ${k + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{storeName}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div><label className="label" htmlFor="pos-customer">{T("اسم العميل")} <span className="font-normal text-muted">({T("اختياري")})</span></label><input id="pos-customer" className="input" value={customer} onChange={(e) => setCustomer(e.target.value)} maxLength={80} /></div>
          <div><label className="label" htmlFor="pos-phone">{T("الهاتف")} <span className="font-normal text-muted">({T("اختياري")})</span></label><input id="pos-phone" className="input" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} /></div>
        </div>
        <div><label className="label" htmlFor="pos-discount">{T("خصم")} (DH)</label><input id="pos-discount" className="input" inputMode="decimal" dir="ltr" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" /></div>
        <div>
          <p className="label">{T("طريقة الدفع")}</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={T("طريقة الدفع")}>
            {PAY.map(({ k, label, icon: Icon }) => (
              <button key={k} type="button" role="radio" aria-checked={payment === k} onClick={() => setPayment(k)} className={cn("flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-xs font-semibold", payment === k ? "border-brand bg-brand/10 text-fg" : "border-line text-ink-2")}>
                <Icon className="h-5 w-5" aria-hidden="true" />{T(label)}
              </button>
            ))}
          </div>
        </div>
        {payment === "cash" && <div><label className="label" htmlFor="pos-received">{T("المبلغ المستلم")} (DH)</label><input id="pos-received" className="input" inputMode="decimal" dir="ltr" value={received} onChange={(e) => setReceived(e.target.value)} placeholder="0" /></div>}

        <dl className="space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{T("المجموع الفرعي")}</dt><dd className="font-semibold tabular-nums" dir="ltr">{eur(subtotal)}</dd></div>
          {off > 0 && <div className="flex justify-between text-ok"><dt>{T("خصم")}</dt><dd className="font-semibold tabular-nums" dir="ltr">−{eur(off)}</dd></div>}
          <div className="flex items-baseline justify-between text-xl font-extrabold"><dt>{T("المجموع")}</dt><dd className="tabular-nums" dir="ltr">{eur(total)}</dd></div>
          {change > 0 && <div className="flex justify-between text-base font-bold text-brand"><dt>{T("الباقي للعميل")}</dt><dd className="tabular-nums" dir="ltr">{eur(change)}</dd></div>}
        </dl>
        {msg && <p role="alert" className="rounded-xl bg-hot-50 px-3 py-2.5 text-sm font-medium text-hot">{msg}</p>}
        <button type="button" onClick={checkout} disabled={saving || !lines.length} className="btn btn-brand btn-lg w-full">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          {saving ? T("جارٍ الحفظ…") : T("تأكيد البيع")}
        </button>
        {lines.length > 0 && <button type="button" onClick={reset} className="btn btn-ghost btn-sm w-full">{T("إفراغ")}</button>}
      </aside>

      {scan && (
        <CameraScan
          onClose={() => setScan(false)}
          onCode={(code) => {
            setScan(false);
            setQ(code);
            search(code, true);
          }}
        />
      )}

      {done && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={T("تم البيع")}>
          <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-ok" aria-hidden="true" />
            <p className="mt-3 text-lg font-extrabold">{T("تم البيع")}</p>
            <p className="mt-1 font-mono text-sm text-muted" dir="ltr">{done.number} · {eur(done.total)}</p>
            {done.change > 0 && <p className="mt-2 font-bold text-brand">{T("الباقي للعميل")} : <span dir="ltr">{eur(done.change)}</span></p>}
            <div className="mt-5 grid gap-2">
              <a href={`/api/admin/orders/${done.id}/invoice?format=receipt`} target="_blank" rel="noreferrer" className="btn btn-primary"><Printer className="h-4.5 w-4.5" aria-hidden="true" />{T("طباعة التذكرة")}</a>
              <a href={`/api/admin/orders/${done.id}/invoice`} target="_blank" rel="noreferrer" className="btn btn-outline"><FileText className="h-4.5 w-4.5" aria-hidden="true" />{T("فاتورة A4 مع الضمان")}</a>
              <button type="button" onClick={reset} className="btn btn-ghost">{T("بيع جديد")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
