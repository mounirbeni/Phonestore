import Link from "next/link";
import { useId } from "react";
import { store } from "@/config/store";
import { localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const SIZES = { md: "h-8 sm:h-9", lg: "h-11 sm:h-12" } as const;

/** One "A": outer shape plus the counter, cut out with evenodd. */
const A = "M0 80L30 0H58L88 80H66L60 64H28L22 80ZM44 21.3L54.75 50H33.25Z";

/**
 * The ELECTRO SALAM wordmark, drawn in code: chrome letters on a single line with a red lightning-bolt
 * first E. Letters sit in a 0–80 box (cap height); the bolt and the T's spike reach below it.
 */
export function Logo({ locale, size = "md", className }: { locale: Locale; size?: keyof typeof SIZES; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const chrome = `url(#chrome${uid})`;
  const red = `url(#red${uid})`;
  return (
    <Link href={localePath(locale)} className={cn("inline-flex items-center", className)} aria-label={store.name}>
      <svg viewBox="0 0 909 140" className={cn("w-auto", SIZES[size])} aria-hidden="true">
        <defs>
          <linearGradient id={`chrome${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="80">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.3" stopColor="#f0f0f0" />
            <stop offset="0.47" stopColor="#bdbdbd" />
            <stop offset="0.53" stopColor="#7d7d7d" />
            <stop offset="0.58" stopColor="#d9d9d9" />
            <stop offset="0.82" stopColor="#f5f5f5" />
            <stop offset="1" stopColor="#a6a6a6" />
          </linearGradient>
          <linearGradient id={`red${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="-9" x2="0" y2="115">
            <stop offset="0" stopColor="#ff6a5c" />
            <stop offset="0.35" stopColor="#e8141c" />
            <stop offset="0.7" stopColor="#c20d17" />
            <stop offset="1" stopColor="#7e0510" />
          </linearGradient>
          <filter id={`edge${uid}`} filterUnits="userSpaceOnUse" x="-6" y="-24" width="921" height="170">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="grown" />
            <feFlood floodColor="#000" />
            <feComposite in2="grown" operator="in" result="outline" />
            <feMerge>
              <feMergeNode in="outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g transform="translate(3 14)" filter={`url(#edge${uid})`}>
          {/* E: the stem is a lightning bolt */}
          <g fill={red}>
            <polygon points="48,-9 140,-9 132,15 40,15" />
            <polygon points="50,32 118,32 113,50 46,50" />
            <polygon points="18,62 132,62 126,80 12,80" />
            <polygon points="34,-9 70,-9 52,28 72,28 0,115 24,48 4,48" />
          </g>

          <g fill="none" stroke={chrome} strokeWidth="19">
            <path transform="translate(146 0)" d="M9 0V71H48" />
            <path transform="translate(200 0)" d="M52 9H9V71H52M9 40H46" />
            <path transform="translate(258 0)" d="M47.85 20.07A22 31 0 1 0 47.85 59.93" />
            <path transform="translate(318 0)" d="M0 9H64" />
            <path transform="translate(388 0)" d="M9 80V9H34a15.5 15.5 0 0 1 0 31H9" />
            <ellipse transform="translate(453 0)" cx="35" cy="40" rx="26" ry="31" />
            <path
              transform="translate(559 0) skewX(-8)"
              d="M47 22C46 13 39 9 28 9C16 9 9 14 9 24C9 34 17 36 28 39C40 42 47 45 47 55C47 65 40 71 27 71C15 71 8 66 7 56"
            />
            <path transform="translate(691 0)" d="M9 0V71H48" />
          </g>
          <g fill={chrome} fillRule="evenodd">
            <polygon transform="translate(388 0)" points="24,42 44,42 60,80 40,80" />
            <polygon transform="translate(318 0)" points="23,18 41,18 41,80 32,104 23,80" />
            <path transform="translate(615 0) scale(0.795 1)" d={A} />
            <path transform="translate(745 0) scale(0.795 1)" d={A} />
            <path transform="translate(821 0) scale(0.8333 1)" d="M0 80V0H22L48 44L74 0H96V80H76V36L55 70H41L20 36V80Z" />
          </g>
        </g>
      </svg>
    </Link>
  );
}
