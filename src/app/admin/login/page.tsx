import { redirect } from "next/navigation";
import { store } from "@/config/store";
import { getMember, homeFor } from "@/lib/auth";
import { LoginForm } from "@/components/admin/login-form";
import { getT } from "@/lib/admin-lang";

export default async function LoginPage() {
  const T = await getT();
  const member = await getMember();
  if (member) redirect(homeFor(member.role));
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 shadow-card">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-ink text-lg font-extrabold text-white">E</span>
          <h1 className="mt-4 text-xl font-extrabold">{T("لوحة تحكم {name}", { name: store.name })}</h1>
          <p className="mt-1 text-sm text-muted">{T("دخول المالك وأعضاء الفريق")}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
