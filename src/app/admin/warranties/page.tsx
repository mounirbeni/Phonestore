import { desc, eq, ilike, or } from "drizzle-orm";
import { FileText, Search, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { orders, stores, warranties } from "@/db/schema";
import { can, requirePerm } from "@/lib/auth";
import { getT } from "@/lib/admin-lang";
import { PageHeader, Panel } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const T = await getT();
  return { title: T("الضمانات") };
}

/** After-sales desk: find a unit's warranty by IMEI, phone, name, order number or warranty code. */
export default async function WarrantiesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const T = await getT();
  const m = await requirePerm("warranties");
  const q = ((await searchParams).q ?? "").trim().slice(0, 60);
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const digits = q.replace(/\D/g, "");
  const rows = await db
    .select({ w: warranties, number: orders.number, shopFr: stores.nameFr, shopAr: stores.nameAr })
    .from(warranties)
    .innerJoin(orders, eq(orders.id, warranties.orderId))
    .leftJoin(stores, eq(stores.id, warranties.storeId))
    .where(
      q
        ? or(
            ilike(warranties.serial, like),
            ilike(warranties.customerName, like),
            ilike(orders.number, like),
            eq(warranties.code, q.toLowerCase()),
            ...(digits.length >= 6 ? [ilike(warranties.phone, `%${digits.slice(-9)}%`)] : []),
          )
        : undefined,
    )
    .orderBy(desc(warranties.startsAt), desc(warranties.id))
    .limit(q ? 100 : 30);
  const date = new Intl.DateTimeFormat(T.lang === "fr" ? "fr-FR" : "ar-u-nu-latn", { dateStyle: "medium", timeZone: "Africa/Casablanca" });
  const now = Date.now();
  const canOrders = can(m.role, "orders");

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title={T("الضمانات")} subtitle={T("ابحث برقم IMEI أو الهاتف أو الاسم أو رقم الطلب أو رمز الضمان.")} />
      <form className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" defaultValue={q} autoFocus className="input !ps-11" placeholder={T("IMEI، هاتف، اسم، رقم الطلب…")} aria-label={T("بحث")} />
        </div>
        <button type="submit" className="btn btn-primary">{T("بحث")}</button>
      </form>
      <Panel title={q ? T("{n} نتيجة", { n: rows.length }) : T("آخر الضمانات")} icon={ShieldCheck} flush>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">{T("لا توجد نتائج")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-mist/60 text-start text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5 text-start font-semibold">{T("المنتج")}</th>
                  <th className="px-4 py-2.5 text-start font-semibold">IMEI</th>
                  <th className="px-4 py-2.5 text-start font-semibold">{T("العميل")}</th>
                  <th className="px-4 py-2.5 text-start font-semibold">{T("ينتهي في")}</th>
                  <th className="px-4 py-2.5 text-start font-semibold">{T("الحالة")}</th>
                  <th className="px-4 py-2.5 text-start font-semibold">{T("الطلب")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ w, number, shopFr, shopAr }) => {
                  const state = w.voided ? "ملغى" : w.endsAt.getTime() < now ? "منتهي" : "ساري";
                  return (
                    <tr key={w.id}>
                      <td className="px-4 py-3"><p className="font-semibold">{w.productName}</p><p className="text-xs text-muted">{[w.variantLabel, T.lang === "fr" ? shopFr : shopAr].filter(Boolean).join(" · ")}</p></td>
                      <td className="px-4 py-3 font-mono text-xs" dir="ltr">{w.serial || "—"}</td>
                      <td className="px-4 py-3"><p>{w.customerName || "—"}</p>{w.phone && <p className="text-xs text-muted" dir="ltr" style={{ textAlign: "start" }}>{w.phone}</p>}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{date.format(w.endsAt)}</td>
                      <td className="px-4 py-3"><span className={cn("chip", state === "ساري" ? "bg-ok-50 text-ok" : state === "منتهي" ? "bg-warn-50 text-warn" : "bg-hot-50 text-hot")}>{T(state)}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {canOrders ? <a href={`/admin/orders/${w.orderId}`} className="font-mono text-xs font-semibold hover:text-brand" dir="ltr">{number}</a> : <span className="font-mono text-xs" dir="ltr">{number}</span>}
                          <a href={`/api/admin/orders/${w.orderId}/invoice`} target="_blank" rel="noreferrer" className="text-muted hover:text-fg" aria-label={T("الفاتورة والضمان")}><FileText className="h-4 w-4" /></a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
