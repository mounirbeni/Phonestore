import Image from "next/image";
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
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 shadow-card">
        <div className="mb-6 text-center">
          <Image src="/logo.png" alt={store.name} width={1600} height={247} sizes="260px" priority className="mx-auto h-9 w-auto" />
          <h1 className="mt-5 text-xl font-extrabold">{T("لوحة التحكم")}</h1>
          <p className="mt-1 text-sm text-muted">{T("دخول المالك وأعضاء الفريق")}</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
