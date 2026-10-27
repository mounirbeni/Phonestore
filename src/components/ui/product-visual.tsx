import type { ArtKind } from "@/lib/art";
import { ProductArt } from "./product-art";
import { cn } from "@/lib/utils";

type Props = {
  image?: string | null;
  art: ArtKind;
  color?: string;
  alt: string;
  className?: string;
  eager?: boolean;
  /** "cover" lets a photo fill its frame edge to edge instead of floating inside it. */
  fit?: "contain" | "cover";
};

/** Shows the product photo when available, otherwise the vector placeholder. */
export function ProductVisual({ image, art, color, alt, className, eager, fit = "contain" }: Props) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={cn("h-full w-full", fit === "cover" ? "object-cover" : "object-contain", className)}
      />
    );
  }
  return <ProductArt kind={art} color={color} className={cn("h-full w-full", className)} />;
}
