"use client";

import { useActionState } from "react";
import { changePassword, updateProfile } from "@/app/actions/account";
import { useI18n } from "@/components/providers";
import { useAccountError } from "./auth-forms";

export function ProfileForms({ firstName, lastName, phone, email }: { firstName: string; lastName: string; phone: string; email: string }) {
  const { d } = useI18n();
  const [pState, pAction, pPending] = useActionState(updateProfile, undefined);
  const [wState, wAction, wPending] = useActionState(changePassword, undefined);
  const pError = useAccountError(pState?.error);
  const wError = useAccountError(wState?.error);
  return (
    <div className="space-y-6">
      <form action={pAction} className="grid gap-4 rounded-3xl border border-line bg-surface p-5 sm:grid-cols-2 sm:p-6">
        <h2 className="text-lg font-bold sm:col-span-2">{d.account.profile}</h2>
        <div><label className="label" htmlFor="firstName">{d.checkout.firstName}</label><input id="firstName" name="firstName" defaultValue={firstName} required maxLength={60} className="input" autoComplete="given-name" /></div>
        <div><label className="label" htmlFor="lastName">{d.checkout.lastName}</label><input id="lastName" name="lastName" defaultValue={lastName} required maxLength={60} className="input" autoComplete="family-name" /></div>
        <div><label className="label" htmlFor="phone">{d.checkout.phone}</label><input id="phone" name="phone" type="tel" defaultValue={phone} required maxLength={30} dir="ltr" className="input" autoComplete="tel" /></div>
        <div><label className="label" htmlFor="email-ro">{d.checkout.email}</label><input id="email-ro" value={email} readOnly dir="ltr" className="input opacity-70" /></div>
        {pError && <p role="alert" className="rounded-xl bg-hot-50 px-4 py-3 text-sm font-medium text-hot sm:col-span-2">{pError}</p>}
        {pState?.ok && <p role="status" className="text-sm font-medium text-ok sm:col-span-2">{d.account.saved}</p>}
        <div className="sm:col-span-2"><button type="submit" disabled={pPending} className="btn btn-brand">{d.account.save}</button></div>
      </form>

      <form action={wAction} className="grid gap-4 rounded-3xl border border-line bg-surface p-5 sm:grid-cols-2 sm:p-6">
        <h2 className="text-lg font-bold sm:col-span-2">{d.account.changePassword}</h2>
        <div><label className="label" htmlFor="current">{d.account.currentPassword}</label><input id="current" name="current" type="password" required dir="ltr" className="input" autoComplete="current-password" /></div>
        <div>
          <label className="label" htmlFor="next">{d.account.newPassword}</label>
          <input id="next" name="next" type="password" required minLength={8} dir="ltr" className="input" autoComplete="new-password" />
          <p className="mt-1.5 text-xs text-muted">{d.account.passwordHint}</p>
        </div>
        {wError && <p role="alert" className="rounded-xl bg-hot-50 px-4 py-3 text-sm font-medium text-hot sm:col-span-2">{wError}</p>}
        {wState?.ok && <p role="status" className="text-sm font-medium text-ok sm:col-span-2">{d.account.saved}</p>}
        <div className="sm:col-span-2"><button type="submit" disabled={wPending} className="btn btn-outline">{d.account.changePassword}</button></div>
      </form>
    </div>
  );
}
