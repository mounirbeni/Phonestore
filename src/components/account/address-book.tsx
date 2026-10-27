"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { deleteAddress, makeDefaultAddress, saveAddress } from "@/app/actions/account";
import { useI18n } from "@/components/providers";
import { store } from "@/config/store";
import { pick } from "@/lib/i18n";
import { useAccountError } from "./auth-forms";

export type AddressRow = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  address2: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

function AddressForm({ value, onDone }: { value?: AddressRow; onDone: () => void }) {
  const { locale, d } = useI18n();
  const router = useRouter();
  const [state, action, pending] = useActionState(saveAddress, undefined);
  const error = useAccountError(state?.error);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  const f = (name: keyof AddressRow) => ({ id: `a-${name}`, name, defaultValue: value ? String(value[name] ?? "") : undefined, className: "input" });
  return (
    <form action={action} className="grid gap-4 rounded-3xl border border-line bg-surface p-5 sm:grid-cols-2">
      {value && <input type="hidden" name="id" value={value.id} />}
      <div><label className="label" htmlFor="a-firstName">{d.checkout.firstName}</label><input {...f("firstName")} required maxLength={60} autoComplete="given-name" /></div>
      <div><label className="label" htmlFor="a-lastName">{d.checkout.lastName}</label><input {...f("lastName")} required maxLength={60} autoComplete="family-name" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="a-phone">{d.checkout.phone}</label><input {...f("phone")} required type="tel" dir="ltr" maxLength={30} autoComplete="tel" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="a-address">{d.checkout.address}</label><input {...f("address")} required maxLength={160} autoComplete="address-line1" /></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="a-address2">{d.checkout.address2}</label><input {...f("address2")} maxLength={160} autoComplete="address-line2" /></div>
      <div><label className="label" htmlFor="a-city">{d.checkout.city}</label><input {...f("city")} required maxLength={80} autoComplete="address-level2" /></div>
      <div><label className="label" htmlFor="a-postalCode">{d.checkout.postalCode}</label><input {...f("postalCode")} dir="ltr" maxLength={12} autoComplete="postal-code" /></div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="a-country">{d.checkout.country}</label>
        <select {...f("country")} defaultValue={value?.country ?? store.countries[0].code}>
          {store.countries.map((c) => <option key={c.code} value={c.code}>{pick(locale, c.fr, c.ar)}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-3 text-sm sm:col-span-2">
        <input type="checkbox" name="isDefault" defaultChecked={value?.isDefault} className="h-5 w-5 rounded accent-brand" />
        {d.account.useByDefault}
      </label>
      {error && <p role="alert" className="rounded-xl bg-hot-50 px-4 py-3 text-sm font-medium text-hot sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={pending} className="btn btn-brand">{d.account.save}</button>
        <button type="button" onClick={onDone} className="btn btn-ghost">{d.account.cancel}</button>
      </div>
    </form>
  );
}

export function AddressBook({ rows }: { rows: AddressRow[] }) {
  const { locale, d } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<AddressRow | "new" | null>(null);
  const done = () => setEditing(null);

  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <AddressForm onDone={done} />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className="btn btn-outline w-full sm:w-auto"><Plus className="h-4.5 w-4.5" aria-hidden="true" />{d.account.addAddress}</button>
      )}
      {rows.length === 0 && editing !== "new" && <p className="rounded-3xl border border-dashed border-line p-8 text-center text-sm text-muted">{d.account.noAddresses}</p>}
      <ul className="space-y-3">
        {rows.map((a) =>
          editing !== "new" && editing?.id === a.id ? (
            <li key={a.id}><AddressForm value={a} onDone={done} /></li>
          ) : (
            <li key={a.id} className="rounded-3xl border border-line bg-surface p-5">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
                <div className="min-w-0 flex-1 text-sm leading-relaxed">
                  <p className="font-bold">{a.firstName} {a.lastName} {a.isDefault && <span className="chip ms-1 bg-brand-50 text-brand">{d.account.defaultAddress}</span>}</p>
                  <p className="text-fg-2">{a.address}{a.address2 ? `, ${a.address2}` : ""}</p>
                  <p className="text-fg-2">{a.postalCode} {a.city} · {pick(locale, store.countries.find((c) => c.code === a.country)?.fr ?? a.country, store.countries.find((c) => c.code === a.country)?.ar ?? a.country)}</p>
                  <p className="text-muted" dir="ltr" style={{ textAlign: locale === "ar" ? "right" : "left" }}>{a.phone}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setEditing(a)} className="btn btn-ghost btn-sm"><Pencil className="h-4 w-4" aria-hidden="true" />{d.account.edit}</button>
                {!a.isDefault && (
                  <button type="button" disabled={pending} onClick={() => start(async () => { await makeDefaultAddress(a.id); router.refresh(); })} className="btn btn-ghost btn-sm"><Star className="h-4 w-4" aria-hidden="true" />{d.account.makeDefault}</button>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(d.account.confirmRemove)) return;
                    start(async () => { await deleteAddress(a.id); router.refresh(); });
                  }}
                  className="btn btn-ghost btn-sm text-hot"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />{d.account.remove}
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
