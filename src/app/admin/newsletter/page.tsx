import { count, desc } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { dateTime } from "@/lib/admin-ui";
import { RemoveSubscriber } from "@/components/admin/remove-subscriber";
import { getT } from "@/lib/admin-lang";

export async function generateMetadata() {
  const T = await getT();
  return { title: T("النشرة البريدية") };
}

export default async function NewsletterPage() {
  const T = await getT();
  await requirePerm("customers");
  const [rows, [total]] = await Promise.all([
    db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)).limit(500),
    db.select({ n: count() }).from(newsletterSubscribers),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{T("النشرة البريدية")}</h1>
          <p className="mt-1 text-sm text-muted">{T("{n} مشترك — من نموذج «ابقَ على اطلاع» أسفل الموقع", { n: total?.n ?? 0 })}</p>
        </div>
        {rows.length > 0 && (
          <a href="/api/admin/newsletter" className="btn btn-outline btn-sm"><Download className="h-4 w-4" aria-hidden="true" />{T("تنزيل CSV")}</a>
        )}
      </div>
      <section className="rounded-2xl border border-line bg-surface">
        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">{T("لا يوجد مشتركون بعد")}</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1 truncate font-medium" dir="ltr" style={{ textAlign: T.lang === "ar" ? "right" : "left" }}>{r.email}</span>
                <span className="chip bg-mist text-muted">{r.locale === "ar" ? T("العربية") : T("الفرنسية")}</span>
                <span className="hidden text-xs text-muted sm:inline">{dateTime(r.createdAt, T.lang)}</span>
                <RemoveSubscriber id={r.id} email={r.email} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
