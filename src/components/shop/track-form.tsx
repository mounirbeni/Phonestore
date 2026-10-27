"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch } from "lucide-react";
import { useI18n } from "@/components/providers";
import { lookupOrder } from "@/app/actions/shop";
import { localePath } from "@/lib/i18n";

export function TrackForm() {
  const { locale, d } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<"rate" | "notFound" | null>(null);

  return (
    <form
      className="space-y-4 rounded-3xl border border-line bg-surface p-6 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          const r = await lookupOrder(String(f.get("number") ?? ""), String(f.get("email") ?? ""));
          if (r.ok) router.push(`${localePath(locale, `/order/${r.number}`)}?t=${r.token}`);
          else setError(r.rate ? "rate" : "notFound");
        });
      }}
    >
      <div>
        <label className="label" htmlFor="number">{d.track.orderNumber}</label>
        <input id="number" name="number" required className="input" placeholder="ES-10001" dir="ltr" autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="email">{d.checkout.email}</label>
        <input id="email" name="email" type="email" required className="input" dir="ltr" autoComplete="email" />
      </div>
      {error && <p role="alert" className="rounded-2xl bg-hot-50 px-4 py-3 text-sm font-medium text-hot">{error === "rate" ? d.common.tooMany : d.track.notFound}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full">
        <PackageSearch className="h-5 w-5" aria-hidden="true" />
        {pending ? d.common.loading : d.track.submit}
      </button>
    </form>
  );
}
