"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { useI18n } from "@/components/providers";

/** Bottom sheet on phones, static sidebar from `lg` up. The form itself is rendered on the server. */
export function FilterPanel({ children, activeCount }: { children: React.ReactNode; activeCount: number }) {
  const { d } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div>
      <button type="button" className="btn btn-outline w-full lg:hidden" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="h-4.5 w-4.5" aria-hidden="true" />
        {d.shop.filters}
        {activeCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-xs text-white">{activeCount}</span>}
      </button>

      {open && <button type="button" className="fixed inset-0 z-[65] bg-black/70 [animation:fade-in_0.2s] lg:hidden" aria-label={d.common.close} onClick={() => setOpen(false)} />}

      <div
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={d.shop.filters}
        onSubmit={() => setOpen(false)}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className={
          open
            ? "fixed inset-x-0 bottom-0 z-[70] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[1.75rem] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] shadow-pop [animation:sheet-up_0.3s_ease-out] lg:static lg:z-auto lg:block lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:pb-0 lg:shadow-none lg:[animation:none]"
            : "hidden lg:block"
        }
      >
        {open && (
          <>
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-line lg:hidden" aria-hidden="true" />
            <div className="flex items-center justify-between px-5 pb-1 pt-3 lg:hidden">
              <h2 className="text-lg font-extrabold">{d.shop.filters}</h2>
              <button type="button" className="btn btn-ghost !h-11 !w-11 !p-0" onClick={() => setOpen(false)} aria-label={d.common.close}>
                <X className="h-5 w-5" />
              </button>
            </div>
          </>
        )}
        <div className={open ? "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 lg:overflow-visible lg:p-0" : ""}>{children}</div>
      </div>
    </div>
  );
}
