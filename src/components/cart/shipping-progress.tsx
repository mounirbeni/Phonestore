"use client";

import { Truck } from "lucide-react";
import { store } from "@/config/store";
import { useI18n } from "@/components/providers";
import { formatPrice } from "@/lib/money";
import { fmt } from "@/lib/utils";

export function ShippingProgress({ subtotal }: { subtotal: number }) {
  const { locale, d } = useI18n();
  const left = store.freeShippingThreshold - subtotal;
  const pct = Math.min(100, Math.round((subtotal / store.freeShippingThreshold) * 100));
  return (
    <div className="rounded-2xl bg-brand-50 p-3.5">
      <p className="flex items-center gap-2 text-sm font-medium text-brand-600">
        <Truck className="h-4 w-4" aria-hidden="true" />
        {left > 0 ? fmt(d.cart.freeShippingLeft, { amount: formatPrice(left, locale) }) : d.cart.freeShippingReached}
      </p>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
