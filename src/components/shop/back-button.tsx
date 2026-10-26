"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

/** App-style back control: returns to the previous screen, or to `fallback` on a cold open. */
export function BackButton({ fallback, label }: { fallback: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface/90 text-fg-2 backdrop-blur transition active:scale-95"
      aria-label={label}
    >
      <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
    </button>
  );
}
