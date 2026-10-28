import { count, desc } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { dateTime } from "@/lib/admin-ui";
import { RemoveSubscriber } from "@/components/admin/remove-subscriber";

export const metadata = { title: "النشرة البريدية" };

export default async function NewsletterPage() {
  await requirePerm("customers");
  const [rows, [total]] = await Promise.all([
    db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)).limit(500),
    db.select({ n: count() }).from(newsletterSubscribers),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">النشرة البريدية</h1>
          <p className="mt-1 text-sm text-muted">{total?.n ?? 0} مشترك — من نموذج «ابقَ على اطلاع» أسفل الموقع</p>
        </div>
        {rows.length > 0 && (
          <a href="/api/admin/newsletter" className="btn btn-outline btn-sm"><Download className="h-4 w-4" aria-hidden="true" />تنزيل CSV</a>
        )}
      </div>
      <section className="rounded-2xl border border-line bg-white">
        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-muted">لا يوجد مشتركون بعد</p>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <span className="min-w-0 flex-1 truncate font-medium" dir="ltr" style={{ textAlign: "right" }}>{r.email}</span>
                <span className="chip bg-mist text-muted">{r.locale === "ar" ? "العربية" : "الفرنسية"}</span>
                <span className="hidden text-xs text-muted sm:inline">{dateTime(r.createdAt)}</span>
                <RemoveSubscriber id={r.id} email={r.email} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
