"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  size?: "sm" | "md";
};

export function QtyStepper({ value, max, onChange, label, size = "md" }: Props) {
  const btn = cn("grid place-items-center rounded-full transition hover:bg-mist disabled:opacity-30 disabled:hover:bg-transparent", size === "md" ? "h-9 w-9" : "h-7 w-7");
  return (
    <div className="inline-flex items-center rounded-full border border-line bg-surface p-0.5" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= 1} aria-label="-">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={cn("text-center text-sm font-semibold tabular-nums", size === "md" ? "w-8" : "w-6")} aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="+">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
