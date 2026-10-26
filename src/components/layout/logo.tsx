import Link from "next/link";
import { store } from "@/config/store";
import { localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Splits "ElectroSalam" into two tones; other names render as a single word. */
function wordmark(name: string) {
  const m = name.match(/^(.+?)([A-Z][a-z]+)$/);
  return m ? { a: m[1], b: m[2] } : { a: name, b: "" };
}

export function Logo({ locale, light, className }: { locale: Locale; light?: boolean; className?: string }) {
  const { a, b } = wordmark(store.name);
  return (
    <Link href={localePath(locale)} className={cn("inline-flex items-center gap-2.5", className)} aria-label={store.name}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#e0112b] to-[#7d0a1c] shadow-[0_8px_18px_-8px_rgb(200_16_46/0.9)] ring-1 ring-white/10">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#fff" aria-hidden="true">
          <path d="M13.2 2.5 5 13.2c-.4.5 0 1.3.7 1.3h4.6l-1 7c-.1.8.9 1.2 1.4.6L19 10.8c.4-.5 0-1.3-.7-1.3h-4.5l.9-6.2c.1-.8-.9-1.2-1.5-.8Z" />
        </svg>
      </span>
      <span className={cn("text-[1.2rem] font-extrabold tracking-tight", light ? "text-white" : "text-fg")} dir="ltr">
        {a}
        {b && <span className="text-brand">{b}</span>}
      </span>
    </Link>
  );
}
