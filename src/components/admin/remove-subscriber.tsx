"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { removeSubscriber } from "@/app/actions/newsletter";

export function RemoveSubscriber({ id, email }: { id: number; email: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`حذف ${email}`}
      className="btn btn-ghost btn-sm !px-2 text-hot"
      onClick={() => {
        if (confirm(`حذف ${email} من النشرة البريدية؟`)) start(() => removeSubscriber(id));
      }}
    >
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
