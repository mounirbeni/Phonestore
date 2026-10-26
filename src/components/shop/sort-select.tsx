"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useI18n } from "@/components/providers";

function Inner({ value, full }: { value: string; full?: boolean }) {
  const { d } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const keys = ["featured", "new", "priceAsc", "priceDesc", "discount"] as const;
  return (
    <label className={full ? "block w-full" : "flex items-center gap-2 text-sm"}>
      {!full && <span className="hidden text-muted sm:inline">{d.shop.sortLabel}</span>}
      {full && <span className="sr-only">{d.shop.sortLabel}</span>}
      <select
        className={full ? "input !rounded-full !py-2.5 !ps-4 font-medium" : "input !w-auto !rounded-full !py-2 !pe-9 !ps-4 text-sm font-medium"}
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("sort", e.target.value);
          next.delete("page");
          router.push(`${pathname}?${next.toString()}`);
        }}
      >
        {keys.map((k) => (
          <option key={k} value={k}>
            {d.shop.sort[k]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SortSelect({ value, full }: { value: string; full?: boolean }) {
  return (
    <Suspense fallback={<div className="h-12 w-full lg:h-10 lg:w-40" />}>
      <Inner value={value} full={full} />
    </Suspense>
  );
}
