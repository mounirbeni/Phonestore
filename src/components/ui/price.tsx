import { discountPercent, formatPrice } from "@/lib/money";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  price: number;
  compareAt?: number | null;
  locale: Locale;
  size?: "sm" | "md" | "lg";
  from?: string;
  className?: string;
};

export function Price({ price, compareAt, locale, size = "md", from, className }: Props) {
  const pct = discountPercent(price, compareAt);
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      {from && <span className="text-xs text-muted">{from}</span>}
      <span
        className={cn(
          "font-bold tracking-tight tabular-nums",
          size === "lg" ? "text-3xl" : size === "md" ? "text-lg" : "text-base",
          pct > 0 && "text-hot",
        )}
        dir="ltr"
      >
        {formatPrice(price, locale)}
      </span>
      {pct > 0 && compareAt && (
        <>
          <span className={cn("text-muted line-through tabular-nums", size === "lg" ? "text-base" : "text-xs")} dir="ltr">
            {formatPrice(compareAt, locale)}
          </span>
          {size === "lg" && <span className="chip bg-hot-50 text-hot" dir="ltr">-{pct}%</span>}
        </>
      )}
    </div>
  );
}
