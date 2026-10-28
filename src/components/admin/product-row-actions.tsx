"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { deleteProduct, setProductActive } from "@/app/actions/admin";
import { useT } from "@/components/admin/admin-lang";

export function ProductRowActions({ id, active, name }: { id: number; active: boolean; name: string }) {
  const T = useT();
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        disabled={pending}
        title={active ? T("إخفاء من المتجر") : T("نشر في المتجر")}
        aria-label={active ? T("إخفاء من المتجر") : T("نشر في المتجر")}
        onClick={() => start(async () => { await setProductActive(id, !active); router.refresh(); })}
        className="grid h-9 w-9 place-items-center rounded-lg text-ink-2 hover:bg-mist"
      >
        {active ? <Eye className="h-4.5 w-4.5" /> : <EyeOff className="h-4.5 w-4.5 text-muted" />}
      </button>
      <button
        type="button"
        disabled={pending}
        title={T("حذف")}
        aria-label={T("حذف")}
        onClick={() => {
          if (confirm(T("حذف «{name}» نهائيًا؟ ستبقى الطلبات السابقة محفوظة.", { name }))) start(async () => { await deleteProduct(id); router.refresh(); });
        }}
        className="grid h-9 w-9 place-items-center rounded-lg text-hot hover:bg-hot-50"
      >
        <Trash2 className="h-4.5 w-4.5" />
      </button>
    </div>
  );
}
