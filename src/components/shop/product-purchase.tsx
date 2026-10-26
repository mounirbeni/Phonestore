"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Banknote, Check, RotateCcw, ShoppingBag, Truck, Zap } from "lucide-react";
import type { ArtKind } from "@/lib/art";
import { useCart, useI18n } from "@/components/providers";
import { ProductVisual } from "@/components/ui/product-visual";
import { Price } from "@/components/ui/price";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { WishlistButton } from "./wishlist-button";
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
  isNew: boolean;
};

export function ProductPurchase({ slug, name, brand, images, art, variants, warrantyMonths, isNew }: Props) {
  const { locale, d } = useI18n();
  const cart = useCart();
  const router = useRouter();

  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selected, setSelected] = useState<V>(firstAvailable);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

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
    <span className="chip bg-[#fff7e6] text-[#b26a00]">{fmt(d.common.lowStock, { n: selected.stock })}</span>
  ) : (
    <span className="chip bg-ok-50 text-ok">
      <Check className="h-3.5 w-3.5" aria-hidden="true" />
      {d.common.inStock}
    </span>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      {/* Gallery */}
      <div className="lg:sticky lg:top-36 lg:self-start">
        <div className="relative aspect-square overflow-hidden rounded-[2rem] bg-gradient-to-b from-mist to-white p-6 sm:p-10">
          <ProductVisual image={images[imgIdx]} art={art} color={selected.colorHex} alt={name} eager className="transition duration-500" />
          <div className="absolute start-4 top-4 flex flex-col items-start gap-1.5">
            {pct > 0 && <span className="chip bg-hot text-white" dir="ltr">-{pct}%</span>}
            {isNew && <span className="chip bg-ink text-white">{d.common.new}</span>}
          </div>
        </div>
        {images.length > 1 && (
          <ul className="mt-3 flex gap-2.5 overflow-x-auto scrollbar-none">
            {images.map((src, i) => (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => setImgIdx(i)}
                  aria-label={`${name} ${i + 1}`}
                  aria-current={i === imgIdx}
                  className={cn("h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-mist p-1.5", i === imgIdx ? "border-ink" : "border-transparent hover:border-line")}
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
        <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{name}</h1>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Price price={selected.price} compareAt={selected.compareAtPrice} locale={locale} size="lg" />
        </div>
        {pct > 0 && selected.compareAtPrice && (
          <p className="mt-1 text-sm font-medium text-hot">{fmt(d.common.save, { amount: formatPrice(selected.compareAtPrice - selected.price, locale) })}</p>
        )}
        <p className="mt-1 text-xs text-muted">{d.common.vatIncluded}</p>
        <div className="mt-4">{stockLabel}</div>

        {colors.length > 1 && (
          <div className="mt-8">
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
                        "relative grid h-11 w-11 place-items-center rounded-full border-2 transition",
                        active ? "border-ink" : "border-transparent hover:border-line",
                        empty && "opacity-45",
                      )}
                    >
                      <span className="h-8 w-8 rounded-full ring-1 ring-inset ring-black/15" style={{ background: c.colorHex }} />
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
            <p className="mb-3 text-sm font-semibold">{d.product.selectStorage}</p>
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
                        "rounded-2xl border-2 px-4 py-2.5 text-sm font-semibold transition",
                        active ? "border-ink bg-ink text-white" : "border-line hover:border-ink",
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

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <QtyStepper value={qty} max={maxQty} onChange={setQty} label={d.common.quantity} />
          <button type="button" onClick={handleAdd} disabled={out} className="btn btn-brand btn-lg min-w-0 flex-1">
            {justAdded ? <Check className="h-5 w-5" aria-hidden="true" /> : <ShoppingBag className="h-5 w-5" aria-hidden="true" />}
            {justAdded ? d.common.added : d.common.addToCart}
          </button>
        </div>
        <div className="mt-3 flex gap-3">
          <button type="button" onClick={handleBuy} disabled={out} className="btn btn-primary btn-lg flex-1">
            <Zap className="h-5 w-5" aria-hidden="true" />
            {d.common.buyNow}
          </button>
          <WishlistButton slug={slug} className="!h-[3.25rem] !w-[3.25rem] !rounded-2xl" />
        </div>
        <p className="mt-3 text-xs text-muted" dir="ltr" style={{ textAlign: locale === "ar" ? "right" : "left" }}>
          {fmt(d.product.sku, { sku: selected.sku })}
        </p>

        <ul className="mt-8 space-y-3.5 rounded-3xl border border-line bg-white p-5 text-sm">
          <li className="flex items-center gap-3"><Banknote className="h-5 w-5 text-brand" aria-hidden="true" />{d.product.deliveryCod}</li>
          <li className="flex items-center gap-3"><Truck className="h-5 w-5 text-brand" aria-hidden="true" />{d.product.deliveryStandard}</li>
          <li className="flex items-center gap-3"><RotateCcw className="h-5 w-5 text-brand" aria-hidden="true" />{d.product.deliveryReturn}</li>
          <li className="flex items-center gap-3"><BadgeCheck className="h-5 w-5 text-brand" aria-hidden="true" />{fmt(d.product.deliveryWarranty, { months: warrantyMonths })}</li>
        </ul>
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted">{name}</p>
          <p className="text-lg font-extrabold tabular-nums" dir="ltr" style={{ textAlign: locale === "ar" ? "right" : "left" }}>{formatPrice(selected.price * qty, locale)}</p>
        </div>
        <button type="button" onClick={handleAdd} disabled={out} className="btn btn-brand">
          <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          {d.common.addToCart}
        </button>
      </div>
    </div>
  );
}
