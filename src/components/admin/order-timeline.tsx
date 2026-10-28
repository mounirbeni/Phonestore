import type { OrderEvent } from "@/db/schema";
import { dateTime, statusLabel } from "@/lib/admin-ui";
import { getT } from "@/lib/admin-lang";

/** Everything that happened to the order, newest first, with who did it. */
export async function OrderTimeline({ events }: { events: OrderEvent[] }) {
  const T = await getT();
  return (
    <section className="rounded-2xl border border-line bg-white p-5 text-sm">
      <h2 className="mb-3 font-bold">{T("سجل الطلب")}</h2>
      {events.length === 0 ? (
        <p className="text-muted">{T("لا يوجد سجل لهذا الطلب.")}</p>
      ) : (
        <ol className="space-y-3 border-s-2 border-line ps-4">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -start-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-ink" aria-hidden="true" />
              <p className="font-semibold">
                {e.kind === "status" && e.status ? T(statusLabel[e.status]) : e.kind === "assign" ? T("إسناد التوصيل") : T("ملاحظة")}
                {e.note && <span className="font-normal text-ink-2"> — {T(e.note)}</span>}
              </p>
              <p className="text-xs text-muted">{dateTime(e.createdAt, T.lang)}{e.by ? ` · ${e.by === "client" ? T("العميل") : T(e.by)}` : ""}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
