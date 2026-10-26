"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useI18n } from "@/components/providers";

function Inner({ value }: { value: string }) {
  const { d } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const keys = ["featured", "new", "priceAsc", "priceDesc", "discount"] as const;
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-muted sm:inline">{d.shop.sortLabel}</span>
      <select
        className="input !w-auto !rounded-full !py-2 !pe-9 !ps-4 text-sm font-medium"
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

export function SortSelect({ value }: { value: string }) {
  return (
    <Suspense fallback={<div className="h-10 w-40" />}>
      <Inner value={value} />
    </Suspense>
  );
}
