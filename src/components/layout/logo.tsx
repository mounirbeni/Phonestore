import Image from "next/image";
import Link from "next/link";
import { store } from "@/config/store";
import { localePath, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Height classes plus the rendered width (px) they produce, so the browser fetches a right-sized file. */
const SIZES = {
  md: { height: "h-8 sm:h-9", sizes: "(min-width: 640px) 233px, 207px" },
  lg: { height: "h-11 sm:h-12", sizes: "(min-width: 640px) 311px, 285px" },
} as const;

export function Logo({ locale, size = "md", className }: { locale: Locale; size?: keyof typeof SIZES; className?: string }) {
  return (
    <Link href={localePath(locale)} className={cn("inline-flex items-center", className)} aria-label={store.name}>
      <Image src="/logo.png" alt="" width={1600} height={247} sizes={SIZES[size].sizes} priority className={cn("w-auto max-w-none", SIZES[size].height)} />
    </Link>
  );
}
