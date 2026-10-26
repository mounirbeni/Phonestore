"use client";

import { Heart } from "lucide-react";
import { useI18n, useWishlist } from "@/components/providers";
import { cn } from "@/lib/utils";

export function WishlistButton({ slug, className, withLabel }: { slug: string; className?: string; withLabel?: boolean }) {
  const { d } = useI18n();
  const wish = useWishlist();
  const on = wish.has(slug);
  const label = on ? d.product.wishlistRemove : d.product.wishlistAdd;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        wish.toggle(slug);
      }}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        "grid place-items-center rounded-full border border-line bg-surface/90 text-fg-2 backdrop-blur transition hover:border-hot hover:text-hot",
        withLabel ? "h-12 gap-2 px-4 grid-flow-col" : "h-10 w-10",
        on && "border-hot text-hot",
        className,
      )}
    >
      <Heart className={cn("h-4.5 w-4.5", on && "fill-hot")} aria-hidden="true" />
      {withLabel && <span className="text-sm font-semibold">{label}</span>}
    </button>
  );
}
