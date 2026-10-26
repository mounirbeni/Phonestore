import Link from "next/link";
import { useId } from "react";
import { store } from "@/config/store";
import { localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SIZES = { md: "h-10", lg: "h-14" } as const;

/**
 * The ELECTRO / SALAM wordmark, drawn in code: silver letters with a red lightning bolt as the first E.
 * Each line is laid out in a 0–80 box so one vertical gradient fits both.
 */
export function Logo({ locale, size = "md", className }: { locale: Locale; size?: keyof typeof SIZES; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const silver = `url(#silver${uid})`;
  return (
    <Link href={localePath(locale)} className={cn("inline-flex items-center", className)} aria-label={store.name}>
      <svg viewBox="0 0 582 200" className={cn("w-auto", SIZES[size])} aria-hidden="true">
        <defs>
          <linearGradient id={`silver${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="80">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#e3e3e3" />
            <stop offset="1" stopColor="#adadad" />
          </linearGradient>
          <linearGradient id={`bolt${uid}`} x1="0.1" y1="0" x2="0.5" y2="1">
            <stop offset="0" stopColor="#ff4b3e" />
            <stop offset="1" stopColor="#c4121e" />
          </linearGradient>
        </defs>

        {/* ELECTRO */}
        <g transform="translate(0 6)">
          <g transform="translate(34 0)">
            <g fill={silver}>
              <rect x="34" y="0" width="46" height="16" />
              <rect x="30" y="32" width="42" height="14" />
              <rect x="12" y="64" width="68" height="16" />
            </g>
            <polygon points="18,0 42,0 28,36 44,36 -16,118 2,50 -14,50" fill={`url(#bolt${uid})`} />
          </g>
          <g fill="none" stroke={silver} strokeWidth="18">
            <path transform="translate(122 0)" d="M9 0V71H54" />
            <path transform="translate(184 0)" d="M58 9H9V71H58M9 40H50" />
            <path transform="translate(250 0)" d="M63.75 20.07A31 31 0 1 0 63.75 59.93" />
            <path transform="translate(326 0)" d="M0 9H70M35 18V80" />
            <path transform="translate(408 0)" d="M9 80V9H40a16 16 0 0 1 0 32H9" />
            <circle transform="translate(482 0)" cx="40" cy="40" r="31" />
          </g>
          <polygon transform="translate(408 0)" points="26,44 48,44 66,80 44,80" fill={silver} />
        </g>

        {/* SALAM */}
        <g transform="translate(0 112)">
          <g fill="none" stroke={silver} strokeWidth="18">
            <path
              transform="translate(180 0)"
              d="M52 22C51 13 43 9 31 9C18 9 9 15 9 25C9 36 19 38 31 40C44 42 51 45 51 55C51 65 43 71 30 71C17 71 9 66 8 56"
            />
            <path transform="translate(332 0)" d="M9 0V71H54" />
          </g>
          <g fill={silver} fillRule="evenodd">
            <path transform="translate(248 0) scale(0.8636 1)" d="M0 80L30 0H58L88 80H66L60 64H28L22 80ZM44 21.3L54.75 50H33.25Z" />
            <path transform="translate(394 0) scale(0.8636 1)" d="M0 80L30 0H58L88 80H66L60 64H28L22 80ZM44 21.3L54.75 50H33.25Z" />
            <path transform="translate(478 0) scale(0.875 1)" d="M0 80V0H22L48 44L74 0H96V80H76V36L55 70H41L20 36V80Z" />
          </g>
        </g>
      </svg>
    </Link>
  );
}
