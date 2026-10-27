import { cn } from "@/lib/utils";

/** Logo files in /public/brands, keyed by brand name lowercased with accents and symbols stripped; value is width / height. */
const LOGOS: Record<string, number> = {
  aiwr: 3.181, amazfit: 4.094, apple: 2.837, blackshark: 3.194, ddpai: 3.131, daiko: 2.525, dell: 1.006, elite: 2.131,
  honor: 5.049, hp: 0.875, itel: 1.475, jedel: 3.586, krohler: 3.206, lg: 2.056, microsoft: 3.05, mophie: 4.127,
  motorola: 1.481, okade: 3.291, philips: 0.825, poco: 2.169, riversong: 3.1, samsung: 3.1, senic: 3.112, sonic: 3.741,
  tcl: 1.9, ugreen: 3.138, xiaomi: 2.206,
};

const keyOf = (brand: string) =>
  brand.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Brand logo in its original colors on a white plate, so dark logos stay visible on the dark theme.
 * Brands without a logo file show their name on the same plate.
 */
export function BrandMark({ brand, size = "md", className }: { brand: string; size?: "sm" | "md"; className?: string }) {
  const key = keyOf(brand);
  const ratio = LOGOS[key];
  const h = size === "sm" ? 28 : 44;
  return (
    <span
      className={cn(
        "flex w-full min-w-0 items-center justify-center overflow-hidden rounded-xl bg-white px-3 text-[#111]",
        size === "sm" ? "h-12" : "h-16 max-w-[220px]",
        className,
      )}
    >
      {ratio ? (
        // eslint-disable-next-line @next/next/no-img-element -- small static logos, already sized
        <img
          src={`/brands/${key}.webp`}
          alt={brand}
          width={Math.round(h * ratio)}
          height={h}
          loading="lazy"
          className="max-h-full max-w-full object-contain"
          style={{ height: h, width: "auto" }}
        />
      ) : (
        <span className={cn("truncate font-extrabold tracking-tight", size === "sm" && "text-sm")} dir="ltr">
          {brand}
        </span>
      )}
    </span>
  );
}
