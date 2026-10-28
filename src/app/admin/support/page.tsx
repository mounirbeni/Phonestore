import Link from "next/link";
import { aliasedTable, and, count, desc, eq, ilike, inArray, or, type SQL } from "drizzle-orm";
import { AlertCircle, Search } from "lucide-react";
import { db } from "@/db";
import { staff, supportTickets, TICKET_STATUSES, TICKET_TYPES, type TicketStatus, type TicketType } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { getT } from "@/lib/admin-lang";
import { dateTime } from "@/lib/admin-ui";
import { ticketStatusChip, ticketStatusLabel, ticketTypeLabel } from "@/lib/support-ui";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/ui";

export async function generateMetadata() {
  const T = await getT();
  return { title: T("الرسائل والشكاوى") };
}

const PER = 30;
type Props = { searchParams: Promise<{ view?: string; type?: string; q?: string; mine?: string; page?: string }> };
/** "todo" = what still needs the team: new and in progress. */
type View = "todo" | "all" | TicketStatus;

export default async function SupportPage({ searchParams }: Props) {
  const T = await getT();
  const me = await requirePerm("support");
  const sp = await searchParams;
  const view: View = sp.view === "all" || TICKET_STATUSES.includes(sp.view as TicketStatus) ? (sp.view as View) : "todo";
  const type = TICKET_TYPES.includes(sp.type as TicketType) ? (sp.type as TicketType) : undefined;
  const q = sp.q?.trim().slice(0, 60) ?? "";
  const mine = sp.mine === "1" && me.id != null;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const base: (SQL | undefined)[] = [type ? eq(supportTickets.type, type) : undefined, mine ? eq(supportTickets.assigneeId, me.id!) : undefined];
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    base.push(or(ilike(supportTickets.number, like), ilike(supportTickets.subject, like), ilike(supportTickets.name, like), ilike(supportTickets.email, like), ilike(supportTickets.phone, like), ilike(supportTickets.orderNumber, like)));
  }
  const viewCond = view === "todo" ? inArray(supportTickets.status, ["new", "open"]) : view === "all" ? undefined : eq(supportTickets.status, view);
  const assignee = aliasedTable(staff, "assignee");
  const [rows, [total], counts] = await Promise.all([
    db
      .select({ t: supportTickets, assignee: assignee.name })
      .from(supportTickets)
      .leftJoin(assignee, eq(supportTickets.assigneeId, assignee.id))
      .where(and(...base, viewCond))
      .orderBy(desc(supportTickets.priority), desc(supportTickets.lastCustomerAt))
      .limit(PER)
      .offset((page - 1) * PER),
    db.select({ n: count() }).from(supportTickets).where(and(...base, viewCond)),
    db.select({ status: supportTickets.status, n: count() }).from(supportTickets).where(and(...base)).groupBy(supportTickets.status),
  ]);
  const by = new Map(counts.map((c) => [c.status, c.n]));
  const tabs: { view: View; label: string; n: number }[] = [
    { view: "todo", label: T("للمعالجة"), n: (by.get("new") ?? 0) + (by.get("open") ?? 0) },
    ...TICKET_STATUSES.map((s) => ({ view: s as View, label: T(ticketStatusLabel[s]), n: by.get(s) ?? 0 })),
    { view: "all", label: T("الكل"), n: counts.reduce((n, c) => n + c.n, 0) },
  ];
  const href = (o: Partial<{ view: View; type: string; mine: boolean; page: number }>) => {
    const p = new URLSearchParams();
    const v = o.view ?? view;
    if (v !== "todo") p.set("view", v);
    const ty = "type" in o ? o.type : type;
    if (ty) p.set("type", ty);
    if (q) p.set("q", q);
    if (o.mine ?? mine) p.set("mine", "1");
    if (o.page && o.page > 1) p.set("page", String(o.page));
    const s = p.toString();
    return `/admin/support${s ? `?${s}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PER));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title={T("الرسائل والشكاوى")}
        subtitle={T("رسائل العملاء من صفحة «اتصل بنا»: أسئلة وشكاوى وطلبات إرجاع وضمان.")}
        actions={me.id != null && <Link href={href({ mine: !mine })} className={cn("btn btn-sm", mine ? "btn-brand" : "btn-outline")}>{T("المسندة إليّ")}</Link>}
      />
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
        {tabs.map((t) => (
          <Link key={t.view} href={href({ view: t.view, page: 1 })} className={cn("btn btn-sm shrink-0", view === t.view ? "btn-brand" : "btn-outline")}>
            {t.label} <span className={cn("rounded-full px-1.5 text-xs tabular-nums", view === t.view ? "bg-white/20" : "opacity-60")}>{t.n}</span>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <form className="relative min-w-60 flex-1" action="/admin/support">
          {view !== "todo" && <input type="hidden" name="view" value={view} />}
          {type && <input type="hidden" name="type" value={type} />}
          {mine && <input type="hidden" name="mine" value="1" />}
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input name="q" defaultValue={q} placeholder={T("رقم، اسم، بريد، هاتف أو رقم الطلب…")} className="input !py-2 ps-9 text-sm" aria-label={T("بحث")} />
        </form>
        <div className="flex flex-wrap gap-1.5">
          <Link href={href({ type: undefined, page: 1 })} className={cn("chip", !type ? "bg-fg text-bg" : "bg-mist text-ink-2")}>{T("كل الأنواع")}</Link>
          {TICKET_TYPES.map((t) => (
            <Link key={t} href={href({ type: t, page: 1 })} className={cn("chip", type === t ? "bg-fg text-bg" : "bg-mist text-ink-2")}>{T(ticketTypeLabel[t])}</Link>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-muted">{T("لا توجد رسائل")}</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map(({ t, assignee: who }) => (
              <li key={t.id}>
                <Link href={`/admin/support/${t.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5 transition hover:bg-mist/50">
                  <span className="w-20 shrink-0 font-semibold text-brand" dir="ltr">{t.number}</span>
                  <span className="min-w-0 flex-1 basis-60">
                    <span className="flex items-center gap-2 font-medium">
                      {t.priority === "high" && <AlertCircle className="h-4 w-4 shrink-0 text-hot" aria-label={T("أولوية عالية")} />}
                      <span className="truncate">{t.subject}</span>
                    </span>
                    <span className="block truncate text-xs text-muted">{t.name} · {T(ticketTypeLabel[t.type])}{t.orderNumber ? ` · ${t.orderNumber}` : ""}</span>
                  </span>
                  <span className={cn("chip", ticketStatusChip[t.status])}>{T(ticketStatusLabel[t.status])}</span>
                  <span className="hidden w-28 truncate text-xs text-muted sm:block">{who ?? T("غير مسندة")}</span>
                  <span className="hidden w-36 text-end text-xs text-muted md:block">{dateTime(t.lastCustomerAt, T.lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {pages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link className="btn btn-outline btn-sm" href={href({ page: page - 1 })}>{T("السابق")}</Link>}
          <span className="text-muted">{T("صفحة {page} من {pages}", { page, pages })}</span>
          {page < pages && <Link className="btn btn-outline btn-sm" href={href({ page: page + 1 })}>{T("التالي")}</Link>}
        </nav>
      )}
    </div>
  );
}
