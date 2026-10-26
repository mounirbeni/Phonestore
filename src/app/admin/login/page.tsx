import { redirect } from "next/navigation";
import { store } from "@/config/store";
import { isAdmin } from "@/lib/auth";
import { LoginForm } from "@/components/admin/login-form";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 shadow-card">
        <div className="mb-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-ink text-lg font-extrabold text-white">E</span>
          <h1 className="mt-4 text-xl font-extrabold">لوحة تحكم {store.name}</h1>
          <p className="mt-1 text-sm text-muted">سجّل الدخول لإدارة المتجر</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
