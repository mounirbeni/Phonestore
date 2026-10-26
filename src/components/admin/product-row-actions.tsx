"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteProduct, setProductActive } from "@/app/actions/admin";

export function ProductRowActions({ id, active, name }: { id: number; active: boolean; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        disabled={pending}
        title={active ? "إخفاء من المتجر" : "نشر في المتجر"}
        aria-label={active ? "إخفاء من المتجر" : "نشر في المتجر"}
        onClick={() => start(async () => { await setProductActive(id, !active); router.refresh(); })}
        className="grid h-9 w-9 place-items-center rounded-lg text-ink-2 hover:bg-mist"
      >
        {active ? <Eye className="h-4.5 w-4.5" /> : <EyeOff className="h-4.5 w-4.5 text-muted" />}
      </button>
      <button
        type="button"
        disabled={pending}
        title="حذف"
        aria-label="حذف"
        onClick={() => {
          if (confirm(`حذف «${name}» نهائيًا؟ ستبقى الطلبات السابقة محفوظة.`)) start(async () => { await deleteProduct(id); router.refresh(); });
        }}
        className="grid h-9 w-9 place-items-center rounded-lg text-hot hover:bg-hot-50"
      >
        <Trash2 className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}
