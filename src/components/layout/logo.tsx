import Link from "next/link";
import { store } from "@/config/store";
import { localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Logo({ locale, light, className }: { locale: Locale; light?: boolean; className?: string }) {
  return (
    <Link href={localePath(locale)} className={cn("inline-flex items-center gap-2.5", className)} aria-label={store.name}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-[#7a4dff] shadow-[0_8px_18px_-8px_rgb(43_76_255/0.8)]">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="6.5" y="2.5" width="11" height="19" rx="3" />
          <path d="M10.5 18.5h3" />
        </svg>
      </span>
      <span className={cn("text-[1.2rem] font-extrabold tracking-tight", light ? "text-white" : "text-ink")} dir="ltr">
        {store.name}
      </span>
    </Link>
  );
}
