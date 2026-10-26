"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; /** Extra classes, to hide the item where it is already shown inline. */ className?: string };

/** Desktop nav overflow: the categories that don't fit in the bar. */
export function NavMore({ label, items, className }: { label: string; items: Item[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <li ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-fg-2 transition hover:bg-mist hover:text-fg"
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <ul className="absolute end-0 top-full z-50 mt-1 min-w-52 rounded-2xl border border-line bg-surface p-1.5 shadow-card">
          {items.map((i) => (
            <li key={i.href} className={i.className}>
              <Link href={i.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-fg-2 transition hover:bg-mist hover:text-fg">
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
