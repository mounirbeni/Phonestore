"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Banknote, Check, MapPin, RotateCcw, ShoppingBag, Truck, Zap } from "lucide-react";
import type { ArtKind } from "@/lib/art";
import { useCart, useI18n } from "@/components/providers";
import { ProductVisual } from "@/components/ui/product-visual";
import { Price } from "@/components/ui/price";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { WishlistButton } from "./wishlist-button";
import { BackButton } from "./back-button";
import { localePath, pick } from "@/lib/i18n";
import { discountPercent, formatPrice } from "@/lib/money";
import { cn, fmt, isolateLtr } from "@/lib/utils";
import { store } from "@/config/store";

type V = {
  id: number;
  sku: string;
  colorFr: string;
  colorAr: string;
  colorHex: string;
  storage: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
};

type Props = {
  slug: string;
  name: string;
  brand: string;
  images: string[];
  art: ArtKind;
  variants: V[];
  warrantyMonths: number;
  /** Heading for the variant chips; empty falls back to "Capacité". */
  optionLabel?: string;
  isNew: boolean;
  condition: "new" | "used";
  conditionNote?: string;
  /** Pickup shops with their quantity of each variant. */
  shops?: { id: number; name: string; address: string; stock: Record<number, number> }[];
};

export function ProductPurchase({ slug, name, brand, images, art, variants, warrantyMonths, optionLabel, isNew, condition, conditionNote, shops = [] }: Props) {
  const { locale, d } = useI18n();
  const cart = useCart();
  const router = useRouter();

  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selected, setSelected] = useState<V>(firstAvailable);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [justAdded, setJustAdded] = useState(false);
  const addRef = useRef<HTMLButtonElement>(null);
  const [showSticky, setShowSticky] = useState(true);
  const [slide, setSlide] = useState(0);
  const railRef = useRef<HTMLUListElement>(null);

  // The sticky buy bar only appears while the in-page "add to cart" button is out of view.
  useEffect(() => {
    const el = addRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const colors = useMemo(() => {
    const m = new Map<string, V>();
    for (const v of variants) if (!m.has(v.colorHex)) m.set(v.colorHex, v);
    return [...m.values()];
  }, [variants]);
  const storages = useMemo(() => [...new Set(variants.map((v) => v.storage).filter(Boolean))], [variants]);

  const colorStock = (hex: string) => variants.filter((v) => v.colorHex === hex).reduce((n, v) => n + v.stock, 0);
  const storageStock = (s: string) => variants.filter((v) => v.storage === s).reduce((n, v) => n + v.stock, 0);

  function pickColor(hex: string) {
    const match =
      variants.find((v) => v.colorHex === hex && v.storage === selected.storage) ??
      variants.find((v) => v.colorHex === hex && v.stock > 0) ??
      variants.find((v) => v.colorHex === hex);
    if (match) pick_(match);
  }
  function pickStorage(s: string) {
    const match =
      variants.find((v) => v.storage === s && v.colorHex === selected.colorHex) ??
      variants.find((v) => v.storage === s && v.stock > 0) ??
      variants.find((v) => v.storage === s);
    if (match) pick_(match);
  }
  function pick_(v: V) {
    setSelected(v);
    setQty((q) => Math.max(1, Math.min(q, v.stock || 1, store.maxQtyPerLine)));
  }

  const colorName = pick(locale, selected.colorFr, selected.colorAr);
  const maxQty = Math.max(1, Math.min(selected.stock, store.maxQtyPerLine));
  const out = selected.stock <= 0;
  const pct = discountPercent(selected.price, selected.compareAtPrice);

  function addToCart() {
    cart.add(
      {
        variantId: selected.id,
        slug,
        name,
        variantLabel: {
          fr: [selected.colorFr, selected.storage].filter(Boolean).join(" · "),
          ar: [selected.colorAr || selected.colorFr, isolateLtr(selected.storage)].filter(Boolean).join(" · "),
        },
        colorHex: selected.colorHex,
        image: images[0] ?? null,
        art,
        price: selected.price,
        compareAt: selected.compareAtPrice && selected.compareAtPrice > selected.price ? selected.compareAtPrice : null,
        stock: selected.stock,
      },
      qty,
    );
  }

  const handleAdd = () => {
    addToCart();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
    cart.setDrawerOpen(true);
  };
  const handleBuy = () => {
    addToCart();
    router.push(localePath(locale, "/checkout"));
  };

  const stockLabel = out ? (
    <span className="chip bg-hot-50 text-hot">{d.common.outOfStock}</span>
  ) : selected.stock <= 5 ? (
    <span className="chip bg-warn-50 text-warn">{fmt(d.common.lowStock, { n: selected.stock })}</span>
  ) : (
    <span className="chip bg-ok-50 text-ok">
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      {d.common.inStock}
    </span>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      {/* Gallery */}
      <div className="lg:sticky lg:top-36 lg:self-start">
        <div className="mb-3 flex items-center justify-between lg:hidden">
          <BackButton fallback={localePath(locale, "/shop")} label={d.common.back} />
          <WishlistButton slug={slug} className="!h-11 !w-11" />
        </div>
        <div className="relative aspect-square overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-mist to-surface lg:rounded-[2rem]">
          {images.length > 1 ? (
            <>
              {/* phones: swipe between photos */}
              <ul
                ref={railRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  setSlide(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
                }}
                className="flex h-full snap-x snap-mandatory overflow-x-auto scrollbar-none lg:hidden"
              >
                {images.map((src, i) => (
                  <li key={src} className="h-full w-full shrink-0 snap-center">
                    <ProductVisual image={src} art={art} color={selected.colorHex} alt={`${name} ${i + 1}`} eager={i === 0} fit="cover" />
                  </li>
                ))}
              </ul>
              <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden" aria-hidden="true">
                {images.map((_, i) => (
                  <span key={i} className={cn("h-1.5 rounded-full transition-all", i === slide ? "w-5 bg-fg" : "w-1.5 bg-fg/30")} />
                ))}
              </div>
              <div className="hidden h-full lg:block">
                <ProductVisual image={images[imgIdx]} art={art} color={selected.colorHex} alt={name} eager fit="cover" className="transition duration-500" />
              </div>
            </>
          ) : (
            <div className={images.length ? "h-full" : "h-full p-6 sm:p-10"}>
              <ProductVisual image={images[0]} art={art} color={selected.colorHex} alt={name} eager fit="cover" className="transition duration-500" />
            </div>
          )}
          <div className="pointer-events-none absolute start-4 top-4 flex flex-col items-start gap-1.5">
            {pct > 0 && <span className="chip bg-hot text-white" dir="ltr">-{pct}%</span>}
            <span className={cn("chip", condition === "used" ? "bg-warn-50 text-warn" : "bg-ok-50 text-ok")}>{condition === "used" ? conditionNote || d.condition.used : d.condition.new}</span>
            {isNew && <span className="chip bg-ink text-white">{d.common.new}</span>}
          </div>
        </div>
        {images.length > 1 && (
          <ul className="mt-3 hidden gap-2.5 overflow-x-auto scrollbar-none lg:flex">
            {images.map((src, i) => (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => setImgIdx(i)}
                  aria-label={`${name} ${i + 1}`}
                  aria-current={i === imgIdx}
                  className={cn("h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-mist p-1.5", i === imgIdx ? "border-fg" : "border-transparent hover:border-line")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-contain" loading="lazy" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Buy box */}
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">{brand}</p>
        <h1 className="mt-1.5 text-[1.65rem] font-extrabold leading-tight tracking-tight sm:mt-2 sm:text-4xl">{name}</h1>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Price price={selected.price} compareAt={selected.compareAtPrice} locale={locale} size="lg" />
        </div>
        {pct > 0 && selected.compareAtPrice && (
          <p className="mt-1 text-sm font-medium text-hot">{fmt(d.common.save, { amount: formatPrice(selected.compareAtPrice - selected.price, locale) })}</p>
        )}
        <p className="mt-1 text-xs text-muted">{d.common.vatIncluded}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {stockLabel}
          {condition === "used" && <span className="chip bg-warn-50 text-warn">{conditionNote || d.condition.used} · {d.condition.usedText}</span>}
        </div>

        {colors.length > 1 && (
          <div className="mt-6 sm:mt-8">
            <p className="mb-3 text-sm font-semibold">{fmt(d.product.selectColor, { name: colorName })}</p>
            <ul className="flex flex-wrap gap-3" role="radiogroup" aria-label={d.common.color}>
              {colors.map((c) => {
                const active = c.colorHex === selected.colorHex;
                const empty = colorStock(c.colorHex) <= 0;
                return (
                  <li key={c.colorHex}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      aria-label={pick(locale, c.colorFr, c.colorAr)}
                      title={pick(locale, c.colorFr, c.colorAr)}
                      onClick={() => pickColor(c.colorHex)}
                      className={cn(
                        "relative grid h-12 w-12 place-items-center rounded-full border-2 transition active:scale-95",
                        active ? "border-fg" : "border-transparent hover:border-line",
                        empty && "opacity-45",
                      )}
                    >
                      <span className="h-8 w-8 rounded-full ring-1 ring-inset ring-fg/20" style={{ background: c.colorHex }} />
                      {empty && <span className="absolute h-px w-9 rotate-45 bg-ink/60" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {storages.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold">{optionLabel || d.product.selectStorage}</p>
            <ul className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={d.common.storage}>
              {storages.map((s) => {
                const active = s === selected.storage;
                const empty = storageStock(s) <= 0;
                return (
                  <li key={s}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => pickStorage(s)}
                      className={cn(
                        "min-h-12 rounded-2xl border-2 px-5 py-2.5 text-sm font-semibold transition active:scale-95",
                        active ? "border-fg bg-fg text-bg" : "border-line hover:border-fg",
                        empty && !active && "text-muted line-through",
                      )}
                    >
                      <span dir="ltr">{s}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
          <QtyStepper value={qty} max={maxQty} onChange={setQty} label={d.common.quantity} />
          <button type="button" onClick={handleAdd} disabled={out} ref={addRef} className="btn btn-brand btn-lg min-w-0 flex-1">
            {justAdded ? <Check className="h-5 w-5" aria-hidden="true" /> : <ShoppingBag className="h-5 w-5" aria-hidden="true" />}
            {justAdded ? d.common.added : d.common.addToCart}
          </button>
        </div>
        <div className="mt-3 flex gap-3">
          <button type="button" onClick={handleBuy} disabled={out} className="btn btn-primary btn-lg flex-1">
            <Zap className="h-5 w-5" aria-hidden="true" />
            {d.common.buyNow}
          </button>
          <WishlistButton slug={slug} className="!h-[3.25rem] !w-[3.25rem] !rounded-2xl max-lg:hidden" />
        </div>
        <p className="mt-3 text-xs text-muted" dir="ltr" style={{ textAlign: locale === "ar" ? "right" : "left" }}>
          {fmt(d.product.sku, { sku: selected.sku })}
        </p>

        {shops.length > 0 && (
          <div className="mt-8 rounded-3xl border border-line bg-surface p-5 text-sm">
            <p className="flex items-center gap-2 font-bold"><MapPin className="h-5 w-5 text-brand" aria-hidden="true" />{d.product.inStore}</p>
            <ul className="mt-3 space-y-2.5">
              {shops.map((s) => {
                const n = s.stock[selected.id] ?? 0;
                return (
                  <li key={s.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-semibold">{s.name}</span>
                      {s.address && <span className="block text-xs text-muted">{s.address}</span>}
                    </span>
                    <span className={cn("chip shrink-0", n > 0 ? "bg-ok-50 text-ok" : "bg-mist text-muted")}>{n > 0 ? d.product.storeAvailable : d.product.storeUnavailable}</span>
                  </li>
                );
              })}
            </ul>
            {shops.some((s) => (s.stock[selected.id] ?? 0) > 0) && <p className="mt-3 text-xs text-muted">{d.product.pickupHint}</p>}
          </div>
        )}

        <ul className="mt-4 space-y-3.5 rounded-3xl border border-line bg-surface p-5 text-sm">
          <li className="flex items-center gap-3"><Banknote className="h-5 w-5 text-brand" aria-hidden="true" />{d.product.deliveryCod}</li>
          <li className="flex items-center gap-3"><Truck className="h-5 w-5 text-brand" aria-hidden="true" />{d.product.deliveryStandard}</li>
          <li className="flex items-center gap-3"><RotateCcw className="h-5 w-5 text-brand" aria-hidden="true" />{d.product.deliveryReturn}</li>
          <li className="flex items-center gap-3"><BadgeCheck className="h-5 w-5 text-brand" aria-hidden="true" />{warrantyMonths === 1 ? d.product.deliveryWarrantyOne : fmt(d.product.deliveryWarranty, { months: warrantyMonths })}</li>
        </ul>
      </div>

      {/* Mobile sticky bar */}
      <div inert={!showSticky} aria-hidden={!showSticky} className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl transition-transform duration-300 lg:hidden", !showSticky && "translate-y-full")}>
        <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{name}</p>
          <p className="text-lg font-extrabold tabular-nums" dir="ltr" style={{ textAlign: locale === "ar" ? "right" : "left" }}>{formatPrice(selected.price * qty, locale)}</p>
        </div>
        <button type="button" onClick={handleAdd} disabled={out} className="btn btn-brand flex-1">
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          {out ? d.common.outOfStock : d.common.addToCart}
        </button>
        </div>
      </div>
    </div>
  );
}
