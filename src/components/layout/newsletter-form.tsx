"use client";

import { useState, useTransition } from "react";
import { Check, Mail } from "lucide-react";
import { subscribeNewsletter } from "@/app/actions/newsletter";
import type { Dict } from "@/lib/dictionary";
import type { Locale } from "@/lib/i18n";

export function NewsletterForm({ locale, d }: { locale: Locale; d: Dict["footer"] }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "ok" | "invalid" | "rate">("idle");
  const [pending, start] = useTransition();

  return (
    <div>
      <h3 className="text-sm font-semibold">{d.newsletterTitle}</h3>
      <p className="mt-2 text-sm text-white/60">{d.newsletterText}</p>
      {state === "ok" ? (
        <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-white">
          <Check className="h-4 w-4 text-[#ff4d5e]" aria-hidden="true" />
          {d.newsletterOk}
        </p>
      ) : (
        <form
          className="mt-4 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await subscribeNewsletter(email, locale);
              setState(r.ok ? "ok" : r.error);
            });
          }}
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{d.newsletterPlaceholder}</span>
            <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" aria-hidden="true" />
            <input
              type="email"
              required
              maxLength={120}
              autoComplete="email"
              inputMode="email"
              dir="ltr"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state !== "idle") setState("idle");
              }}
              placeholder={d.newsletterPlaceholder}
              className="h-11 w-full rounded-xl border border-white/15 bg-white/5 ps-9 pe-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
          </label>
          <button type="submit" disabled={pending} className="btn btn-brand h-11 shrink-0 px-4">
            {d.newsletterCta}
          </button>
        </form>
      )}
      {(state === "invalid" || state === "rate") && (
        <p role="alert" className="mt-2 text-sm text-[#ff4d5e]">{state === "invalid" ? d.newsletterInvalid : d.newsletterRate}</p>
      )}
    </div>
  );
}
