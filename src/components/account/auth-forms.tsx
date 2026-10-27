"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LogIn, UserPlus } from "lucide-react";
import { register, signIn } from "@/app/actions/account";
import { useI18n } from "@/components/providers";
import { localePath } from "@/lib/i18n";

/** Maps a server error code (or the name of the invalid field) to a message. */
export function useAccountError(code?: string) {
  const { d } = useI18n();
  if (!code) return null;
  const e = d.account.errors;
  return code in e ? e[code as keyof typeof e] : e.form;
}

function Hidden({ next }: { next?: string }) {
  const { locale } = useI18n();
  return (
    <>
      <input type="hidden" name="locale" value={locale} />
      {next && <input type="hidden" name="next" value={next} />}
    </>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const { locale, d } = useI18n();
  const [state, action, pending] = useActionState(signIn, undefined);
  const error = useAccountError(state?.error);
  return (
    <form action={action} className="space-y-4">
      <Hidden next={next} />
      <div>
        <label className="label" htmlFor="email">{d.checkout.email}</label>
        <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className="input" maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="password">{d.account.password}</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" dir="ltr" className="input" maxLength={100} />
      </div>
      {error && <p role="alert" className="rounded-xl bg-hot-50 px-4 py-3 text-sm font-medium text-hot">{error}</p>}
      <button type="submit" disabled={pending} className="btn btn-brand btn-lg w-full"><LogIn className="h-5 w-5" aria-hidden="true" />{d.account.signIn}</button>
      <p className="text-center text-sm text-muted">
        {d.account.noAccount}{" "}
        <Link href={`${localePath(locale, "/account/register")}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:underline">{d.account.signUp}</Link>
      </p>
      <p className="text-center text-xs text-muted">{d.account.forgot}</p>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const { locale, d } = useI18n();
  const [state, action, pending] = useActionState(register, undefined);
  const error = useAccountError(state?.error);
  return (
    <form action={action} className="space-y-4">
      <Hidden next={next} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="firstName">{d.checkout.firstName}</label>
          <input id="firstName" name="firstName" required autoComplete="given-name" className="input" maxLength={60} />
        </div>
        <div>
          <label className="label" htmlFor="lastName">{d.checkout.lastName}</label>
          <input id="lastName" name="lastName" required autoComplete="family-name" className="input" maxLength={60} />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="email">{d.checkout.email}</label>
        <input id="email" name="email" type="email" required autoComplete="email" dir="ltr" className="input" maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="phone">{d.checkout.phone}</label>
        <input id="phone" name="phone" type="tel" required autoComplete="tel" dir="ltr" className="input" maxLength={30} />
      </div>
      <div>
        <label className="label" htmlFor="password">{d.account.password}</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" dir="ltr" className="input" maxLength={100} />
        <p className="mt-1.5 text-xs text-muted">{d.account.passwordHint}</p>
      </div>
      {error && <p role="alert" className="rounded-xl bg-hot-50 px-4 py-3 text-sm font-medium text-hot">{error}</p>}
      <button type="submit" disabled={pending} className="btn btn-brand btn-lg w-full"><UserPlus className="h-5 w-5" aria-hidden="true" />{d.account.signUp}</button>
      <p className="text-center text-sm text-muted">
        {d.account.haveAccount}{" "}
        <Link href={`${localePath(locale, "/account/login")}${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand hover:underline">{d.account.signIn}</Link>
      </p>
    </form>
  );
}
