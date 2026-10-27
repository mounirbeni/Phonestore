import { cn } from "@/lib/utils";

/** Monochrome logos in /public/brands (Simple Icons), keyed by lowercased brand name.
 *  `ratio` is width / height of the cropped artwork; `wordmark` logos already spell the name. */
const LOGOS: Record<string, { file: string; ratio: number; wordmark?: boolean }> = {
  apple: { file: "apple", ratio: 0.815 },
  dell: { file: "dell", ratio: 1 },
  honor: { file: "honor", ratio: 5.199, wordmark: true },
  hp: { file: "hp", ratio: 1 },
  lg: { file: "lg", ratio: 2.268, wordmark: true },
  motorola: { file: "motorola", ratio: 1 },
  samsung: { file: "samsung", ratio: 6.543, wordmark: true },
  xiaomi: { file: "xiaomi", ratio: 1 },
};

/**
 * Brand logo painted in the current text color (CSS mask), so it follows light/dark themes and hover
 * colors. Wordmarks render alone; symbol logos sit next to the name. Brands without a logo show the name.
 */
export function BrandMark({ brand, size = "md", className }: { brand: string; size?: "sm" | "md"; className?: string }) {
  const logo = LOGOS[brand.toLowerCase()];
  const name = (
    <span className="font-extrabold tracking-tight" dir="ltr">
      {brand}
    </span>
  );
  if (!logo) return <span className={className}>{name}</span>;
  const h = logo.wordmark ? (size === "sm" ? 16 : 22) : size === "sm" ? 24 : 34;
  const mask = `url(/brands/${logo.file}.svg) center / contain no-repeat`;
  const mark = (
    <span
      role="img"
      aria-label={brand}
      className="block max-w-full shrink bg-current"
      style={{ height: h, width: Math.round(h * logo.ratio), WebkitMask: mask, mask }}
    />
  );
  if (logo.wordmark) return <span className={cn("flex max-w-[85%] justify-center", className)}>{mark}</span>;
  return (
    <span className={cn("flex items-center gap-2", size === "md" && "flex-col gap-1.5", className)}>
      {mark}
      {name}
    </span>
  );
}
