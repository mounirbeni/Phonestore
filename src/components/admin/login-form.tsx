"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { login } from "@/app/actions/admin";
import { useT } from "@/components/admin/admin-lang";

export function LoginForm() {
  const T = useT();
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">{T("البريد الإلكتروني")}</label>
        <input id="email" name="email" type="email" autoFocus autoComplete="username" className="input" dir="ltr" />
        <p className="mt-1.5 text-xs text-muted">{T("المالك: اترك البريد فارغًا واستعمل كلمة مرور المتجر.")}</p>
      </div>
      <div>
        <label htmlFor="password" className="label">{T("كلمة المرور")}</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" dir="ltr" />
      </div>
      {state?.error && <p role="alert" className="rounded-xl bg-hot-50 px-4 py-3 text-sm font-medium text-hot">{T(state.error)}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full">
        <Lock className="h-4.5 w-4.5" aria-hidden="true" />
        {pending ? T("جارٍ التحقق…") : T("دخول")}
      </button>
    </form>
  );
}
