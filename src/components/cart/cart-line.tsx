"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useCart, useI18n, type CartLine } from "@/components/providers";
import { ProductVisual } from "@/components/ui/product-visual";
import { QtyStepper } from "@/components/ui/qty-stepper";
import { Price } from "@/components/ui/price";
import { localePath, pick } from "@/lib/i18n";
import { formatPrice } from "@/lib/money";

export function CartLineItem({ line, onNavigate }: { line: CartLine; onNavigate?: () => void }) {
  const { locale, d } = useI18n();
  const cart = useCart();
  const label = [pick(locale, line.variantLabel.fr, line.variantLabel.ar)].filter(Boolean).join(" · ");
  return (
    <li className="flex gap-4 py-4">
      <Link
        href={localePath(locale, `/p/${line.slug}`)}
        onClick={onNavigate}
        className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-mist p-1.5 sm:h-24 sm:w-24"
      >
        <ProductVisual image={line.image} art={line.art} color={line.colorHex} alt={line.name} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={localePath(locale, `/p/${line.slug}`)} onClick={onNavigate} className="line-clamp-2 text-sm font-semibold hover:underline">
              {line.name}
            </Link>
            {label && <p className="mt-0.5 text-xs text-muted">{label}</p>}
          </div>
          <button
            type="button"
            onClick={() => cart.remove(line.variantId)}
            className="-me-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-hot-50 hover:text-hot active:bg-hot-50"
            aria-label={`${d.common.remove}: ${line.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <QtyStepper size="sm" value={line.qty} max={line.stock} label={d.common.quantity} onChange={(v) => cart.setQty(line.variantId, v)} />
          <div className="text-end">
            <Price price={line.price * line.qty} compareAt={line.compareAt ? line.compareAt * line.qty : null} locale={locale} size="sm" className="justify-end" />
            {line.qty > 1 && (
              <p className="text-[0.7rem] text-muted" dir="ltr">
                {formatPrice(line.price, locale)} × {line.qty}
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
