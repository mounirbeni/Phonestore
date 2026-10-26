"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RotateCw, TriangleAlert } from "lucide-react";
import { ar } from "@/dictionaries/ar";
import { fr } from "@/dictionaries/fr";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = usePathname().startsWith("/ar") ? "ar" : "fr";
  const d = locale === "ar" ? ar : fr;
  return (
    <div className="container-x grid min-h-[55vh] place-items-center py-16 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-hot-50 text-hot">
          <TriangleAlert className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-extrabold">{d.errorPage.title}</h1>
        <p className="mt-2 text-sm text-muted">{d.errorPage.text}</p>
        <div className="mt-7 flex flex-col gap-3">
          <button type="button" onClick={reset} className="btn btn-brand btn-lg">
            <RotateCw className="h-4.5 w-4.5" aria-hidden="true" />
            {d.errorPage.retry}
          </button>
          <Link href={`/${locale}`} className="btn btn-outline">
            {d.notFound.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
