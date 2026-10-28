"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { saveProduct, type ProductPayload } from "@/app/actions/admin";
import { cn } from "@/lib/utils";
import { useT } from "@/components/admin/admin-lang";

type VariantState = {
  id?: number;
  sku: string;
  colorFr: string;
  colorAr: string;
  colorHex: string;
  storage: string;
  price: string;
  compareAt: string;
  stock: string;
  barcode?: string;
};

export type ProductFormInitial = {
  id?: number;
  name: string;
  slug: string;
  brand: string;
  categoryId: number;
  shortFr: string;
  shortAr: string;
  descFr: string;
  descAr: string;
  images: string[];
  specsText: string;
  featured: boolean;
  isNew: boolean;
  active: boolean;
  warrantyMonths: number;
  condition: "new" | "used";
  variants: VariantState[];
};

const blankVariant = (): VariantState => ({ sku: "", colorFr: "", colorAr: "", colorHex: "#1c1c1e", storage: "", price: "", compareAt: "", stock: "0" });

export function ProductForm({ initial, categories, mainStore = "" }: { initial: ProductFormInitial; categories: { label: string | null; items: { id: number; nameAr: string }[] }[]; mainStore?: string }) {
  const T = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductFormInitial>(k: K, v: ProductFormInitial[K]) => setF((p) => ({ ...p, [k]: v }));
  const setVariant = (i: number, patch: Partial<VariantState>) => setF((p) => ({ ...p, variants: p.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        if (res.status === 501) throw new Error(T("رفع الصور غير مفعّل بعد. أضف رابط الصورة يدويًا أو فعّل Vercel Blob (انظر README)."));
        if (!res.ok) throw new Error(T("فشل رفع الصورة (JPG/PNG/WebP حتى 5MB)"));
        urls.push((await res.json()).url);
      }
      setF((p) => ({ ...p, images: [...p.images, ...urls].slice(0, 10) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : T("فشل الرفع"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const num = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(",", ".")));
    const variants: ProductPayload["variants"] = [];
    for (const v of f.variants) {
      const price = num(v.price);
      const stock = num(v.stock);
      if (!Number.isFinite(price) || price < 0) return setError(T("أدخل سعرًا صحيحًا لكل خيار"));
      if (!Number.isInteger(stock) || stock < 0) return setError(T("المخزون يجب أن يكون رقمًا صحيحًا"));
      const cmp = num(v.compareAt);
      variants.push({
        id: v.id,
        sku: v.sku,
        colorFr: v.colorFr,
        colorAr: v.colorAr,
        colorHex: v.colorHex,
        storage: v.storage,
        price,
        compareAt: Number.isFinite(cmp) && cmp > price ? cmp : null,
        stock,
        barcode: v.barcode ?? "",
      });
    }
    start(async () => {
      const r = await saveProduct({
        id: f.id,
        name: f.name,
        slug: f.slug,
        brand: f.brand,
        categoryId: f.categoryId,
        shortFr: f.shortFr,
        shortAr: f.shortAr,
        descFr: f.descFr,
        descAr: f.descAr,
        images: f.images,
        specsText: f.specsText,
        featured: f.featured,
        isNew: f.isNew,
        active: f.active,
        warrantyMonths: f.warrantyMonths,
        condition: f.condition,
        variants,
      });
      if (!r.ok) return setError(T(r.error));
      router.push("/admin/products");
      router.refresh();
    });
  }

  const card = "space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6";
  const h2 = "text-base font-bold";

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className={card}>
        <h2 className={h2}>{T("المعلومات الأساسية")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">{T("اسم المنتج")}</label>
            <input id="name" className="input" required minLength={2} maxLength={120} value={f.name} onChange={(e) => set("name", e.target.value)} dir="ltr" placeholder="Apple iPhone 16 Pro" />
          </div>
          <div>
            <label className="label" htmlFor="brand">{T("العلامة التجارية")}</label>
            <input id="brand" className="input" required maxLength={40} value={f.brand} onChange={(e) => set("brand", e.target.value)} dir="ltr" placeholder="Apple" />
          </div>
          <div>
            <label className="label" htmlFor="cat">{T("الفئة")}</label>
            <select id="cat" className="input" value={f.categoryId} onChange={(e) => set("categoryId", Number(e.target.value))}>
              {categories.map((g) =>
                g.label ? (
                  <optgroup key={g.label} label={g.label}>{g.items.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)}</optgroup>
                ) : (
                  g.items.map((c) => <option key={c.id} value={c.id}>{c.nameAr}</option>)
                ),
              )}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="slug">{T("رابط المنتج (اختياري)")}</label>
            <input id="slug" className="input" value={f.slug} onChange={(e) => set("slug", e.target.value)} dir="ltr" placeholder={T("يُولَّد تلقائيًا")} />
          </div>
          <div>
            <label className="label" htmlFor="condition">{T("حالة المنتج")}</label>
            <select id="condition" className="input" value={f.condition} onChange={(e) => {
                const condition = e.target.value as "new" | "used";
                // Store warranty: 12 months new, 1 month used; a custom value is kept.
                setF((p) => ({ ...p, condition, warrantyMonths: p.warrantyMonths === 12 || p.warrantyMonths === 1 ? (condition === "used" ? 1 : 12) : p.warrantyMonths }));
              }}>
              <option value="new">{T("جديد")}</option>
              <option value="used">{T("مستعمل")}</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="warranty">{T("الضمان (أشهر)")}</label>
            <input id="warranty" type="number" min={0} max={120} className="input" value={f.warrantyMonths} onChange={(e) => set("warrantyMonths", Number(e.target.value) || 0)} dir="ltr" />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1 text-sm">
          {([["active", T("منشور في المتجر")], ["featured", T("منتج مميّز (الصفحة الرئيسية)")], ["isNew", T("شارة «جديد»")]] as const).map(([k, label]) => (
            <label key={k} className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={f[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4 rounded accent-brand" />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}>{T("الوصف")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="shortFr">{T("وصف مختصر — الفرنسية")}</label>
            <textarea id="shortFr" rows={2} maxLength={300} className="input" value={f.shortFr} onChange={(e) => set("shortFr", e.target.value)} dir="ltr" />
          </div>
          <div>
            <label className="label" htmlFor="shortAr">{T("وصف مختصر — العربية")}</label>
            <textarea id="shortAr" rows={2} maxLength={300} className="input" value={f.shortAr} onChange={(e) => set("shortAr", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="descFr">{T("وصف كامل — الفرنسية")}</label>
            <textarea id="descFr" rows={5} maxLength={4000} className="input" value={f.descFr} onChange={(e) => set("descFr", e.target.value)} dir="ltr" />
          </div>
          <div>
            <label className="label" htmlFor="descAr">{T("وصف كامل — العربية")}</label>
            <textarea id="descAr" rows={5} maxLength={4000} className="input" value={f.descAr} onChange={(e) => set("descAr", e.target.value)} />
          </div>
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}>{T("الصور")}</h2>
        <p className="text-sm text-muted">{T("الصورة الأولى هي الصورة الرئيسية. إن لم تضف صورًا يُعرض رسم توضيحي تلقائي.")}</p>
        {f.images.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {f.images.map((src, i) => (
              <li key={src + i} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-line bg-mist p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-contain" />
                <button type="button" onClick={() => set("images", f.images.filter((_, j) => j !== i))} className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-white" aria-label={T("حذف الصورة")}>
                  <X className="h-3.5 w-3.5" />
                </button>
                {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-0.5 text-center text-[0.6rem] text-white">{T("رئيسية")}</span>}
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => upload(e.target.files)} />
          <button type="button" className="btn btn-outline btn-sm" disabled={uploading || f.images.length >= 10} onClick={() => fileRef.current?.click()}>
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {uploading ? T("جارٍ الرفع…") : T("رفع صور")}
          </button>
          <input
            className="input !w-72 !py-2 text-sm"
            dir="ltr"
            placeholder={T("https://… رابط صورة")}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (/^(https?:\/\/|\/)/.test(urlInput.trim())) {
                  set("images", [...f.images, urlInput.trim()].slice(0, 10));
                  setUrlInput("");
                }
              }
            }}
          />
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={!/^(https?:\/\/|\/)/.test(urlInput.trim())}
            onClick={() => {
              set("images", [...f.images, urlInput.trim()].slice(0, 10));
              setUrlInput("");
            }}
          >
            {T("إضافة الرابط")}
          </button>
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}>{T("الخيارات والأسعار والمخزون")}</h2>
        <p className="text-sm text-muted">{T("لكل لون/سعة صف مستقل بسعره ومخزونه. «السعر قبل التخفيض» اختياري ويُظهر نسبة الخصم.")}</p>
        <div className="space-y-3">
          {f.variants.map((v, i) => (
            <div key={v.id ?? `n${i}`} className="rounded-2xl border border-line p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="label">{T("اللون (فرنسية)")}</label>
                  <input className="input !py-2" dir="ltr" value={v.colorFr} onChange={(e) => setVariant(i, { colorFr: e.target.value })} placeholder="Noir" />
                </div>
                <div>
                  <label className="label">{T("اللون (عربية)")}</label>
                  <input className="input !py-2" value={v.colorAr} onChange={(e) => setVariant(i, { colorAr: e.target.value })} placeholder={T("أسود")} />
                </div>
                <div>
                  <label className="label">{T("درجة اللون")}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={v.colorHex} onChange={(e) => setVariant(i, { colorHex: e.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-surface p-1" aria-label={T("اختر اللون")} />
                    <input className="input !py-2" dir="ltr" value={v.colorHex} onChange={(e) => setVariant(i, { colorHex: e.target.value })} maxLength={7} />
                  </div>
                </div>
                <div>
                  <label className="label">{T("السعة")}</label>
                  <input className="input !py-2" dir="ltr" value={v.storage} onChange={(e) => setVariant(i, { storage: e.target.value })} placeholder="256 Go" />
                </div>
                <div>
                  <label className="label">{T("السعر (DH)")}</label>
                  <input className="input !py-2" inputMode="decimal" dir="ltr" required value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} placeholder="899" />
                </div>
                <div>
                  <label className="label">{T("السعر قبل التخفيض (DH)")}</label>
                  <input className="input !py-2" inputMode="decimal" dir="ltr" value={v.compareAt} onChange={(e) => setVariant(i, { compareAt: e.target.value })} />
                </div>
                <div>
                  <label className="label">{T("المخزون")} · {mainStore}</label>
                  <input className="input !py-2" inputMode="numeric" dir="ltr" required value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} />
                </div>
                <div>
                  <label className="label">SKU</label>
                  <input className="input !py-2" dir="ltr" value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} placeholder={T("تلقائي")} />
                </div>
                <div>
                  <label className="label">{T("الباركود (EAN)")}</label>
                  <input className="input !py-2" dir="ltr" inputMode="numeric" value={v.barcode ?? ""} onChange={(e) => setVariant(i, { barcode: e.target.value })} placeholder="6941812..." />
                </div>
              </div>
              {f.variants.length > 1 && (
                <button type="button" onClick={() => set("variants", f.variants.filter((_, j) => j !== i))} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-hot hover:underline">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {T("حذف هذا الخيار")}
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => set("variants", [...f.variants, { ...blankVariant(), price: f.variants[0]?.price ?? "" }])}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {T("إضافة خيار")}
        </button>
      </section>

      <section className={card}>
        <h2 className={h2}>{T("المواصفات التقنية")}</h2>
        <p className="text-sm text-muted">{T("سطر لكل مواصفة بالصيغة:")} <code dir="ltr" className="rounded bg-mist px-1.5 py-0.5">Écran | الشاشة | 6,3&quot; OLED</code></p>
        <textarea rows={6} className="input font-mono text-sm" dir="ltr" value={f.specsText} onChange={(e) => set("specsText", e.target.value)} />
      </section>

      {error && <p role="alert" className="rounded-xl bg-hot-50 px-4 py-3 text-sm font-medium text-hot">{error}</p>}
      <div className="sticky bottom-20 z-10 flex gap-3 rounded-2xl border border-line bg-surface/90 p-3 backdrop-blur lg:bottom-4">
        <button type="submit" disabled={pending} className={cn("btn btn-brand", pending && "opacity-70")}>{pending ? T("جارٍ الحفظ…") : T("حفظ المنتج")}</button>
        <button type="button" onClick={() => router.push("/admin/products")} className="btn btn-outline">{T("إلغاء")}</button>
      </div>
    </form>
  );
}
