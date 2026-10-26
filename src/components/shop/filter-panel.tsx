"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useI18n } from "@/components/providers";

/** Collapsible filters on mobile, always visible from `lg` up. */
export function FilterPanel({ children, activeCount }: { children: React.ReactNode; activeCount: number }) {
  const { d } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" className="btn btn-outline w-full lg:hidden" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <SlidersHorizontal className="h-4.5 w-4.5" aria-hidden="true" />
        {d.shop.filters}
        {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-xs text-white">{activeCount}</span>}
      </button>
      <div className={open ? "mt-3 block" : "hidden lg:block"}>{children}</div>
    </div>
  );
}
