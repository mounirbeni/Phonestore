import Link from "next/link";
import { headers } from "next/headers";
import { getDictionary } from "@/lib/dictionary";
import { isLocale, localePath } from "@/lib/i18n";

export default async function NotFound() {
  const h = await headers();
  const seg = (h.get("x-pathname") ?? "").split("/")[1];
  const locale = isLocale(seg) ? seg : "fr";
  const d = getDictionary(locale);
  return (
    <div className="container-x grid min-h-[55vh] place-items-center py-20 text-center">
      <div>
        <p className="text-7xl font-extrabold tracking-tight text-brand">404</p>
        <h1 className="mt-4 text-2xl font-extrabold">{d.notFound.title}</h1>
        <p className="mt-2 text-muted">{d.notFound.text}</p>
        <Link href={localePath(locale)} className="btn btn-primary btn-lg mt-8">{d.notFound.cta}</Link>
      </div>
    </div>
  );
}
