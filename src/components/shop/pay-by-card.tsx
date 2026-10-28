"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { startCardPayment } from "@/app/actions/shop";

/** Sends the customer to the Payzone payment page for the advance. */
export function PayByCard({ number, token, label, busy, error }: { number: string; token: string; label: string; busy: string; error: string }) {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="btn btn-brand btn-lg w-full"
        onClick={() =>
          start(async () => {
            setFailed(false);
            const r = await startCardPayment(number, token);
            if (!r.ok) return setFailed(true);
            const form = document.createElement("form");
            form.method = "POST";
            form.action = r.checkout.url;
            for (const [k, v] of Object.entries(r.checkout.fields)) {
              const input = document.createElement("input");
              input.type = "hidden";
              input.name = k;
              input.value = v;
              form.append(input);
            }
            document.body.append(form);
            form.submit();
          })
        }
      >
        <CreditCard className="h-5 w-5" aria-hidden="true" />
        {pending ? busy : label}
      </button>
      {failed && <p role="alert" className="mt-2 text-sm font-medium text-hot">{error}</p>}
    </div>
  );
}
