"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { removeSubscriber } from "@/app/actions/newsletter";
import { useT } from "@/components/admin/admin-lang";

export function RemoveSubscriber({ id, email }: { id: number; email: string }) {
  const T = useT();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={T("حذف {email}", { email })}
      className="btn btn-ghost btn-sm !px-2 text-hot"
      onClick={() => {
        if (confirm(T("حذف {email} من النشرة البريدية؟", { email }))) start(() => removeSubscriber(id));
      }}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
