import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { todayInShop } from "@/lib/shop-day";
import { Banknote, CreditCard, Landmark, Printer, Receipt } from "lucide-react";
import { db } from "@/db";
import { orders, staff } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { activeStores } from "@/lib/stock";
import { getT } from "@/lib/admin-lang";
import { eur } from "@/lib/admin-ui";
import { PageHeader, Panel, StatTile } from "@/components/admin/ui";
import { PosTill } from "@/components/admin/pos-till";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const T = await getT();
  return { title: T("صندوق البيع") };
}

export default async function PosPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const T = await getT();
  const m = await requirePerm("pos");
  const all = await activeStores();
  // A seller only ever sees their own shop's till.
  const [me] = m.role === "seller" && m.id ? await db.select({ storeId: staff.storeId }).from(staff).where(eq(staff.id, m.id)).limit(1) : [];
  const shops = m.role === "seller" ? all.filter((s) => s.id === me?.storeId) : all;
  if (!shops.length) return <p className="rounded-2xl bg-surface p-8 text-center">{T("لم يُحدَّد لك متجر بعد. اطلب من المالك ذلك من صفحة «الفريق».")}</p>;
  const wanted = parseInt((await searchParams).store ?? "", 10);
  const shop = shops.find((s) => s.id === wanted) ?? shops[0];
  const name = (s: (typeof all)[number]) => (T.lang === "fr" ? s.nameFr : s.nameAr);

  const sales = await db
    .select({ id: orders.id, number: orders.number, total: orders.total, payment: orders.paymentMethod, status: orders.status, at: orders.createdAt, seller: staff.name })
    .from(orders)
    .leftJoin(staff, eq(staff.id, orders.sellerId))
    .where(and(eq(orders.channel, "store"), eq(orders.storeId, shop.id), todayInShop()))
    .orderBy(desc(orders.createdAt));
  const valid = sales.filter((s) => s.status !== "cancelled");
  const by = (p: string) => valid.filter((s) => s.payment === p).reduce((n, s) => n + s.total, 0);
  const time = new Intl.DateTimeFormat(T.lang === "fr" ? "fr-FR" : "ar-u-nu-latn", { timeStyle: "short", timeZone: "Africa/Casablanca" });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={T("صندوق البيع")}
        subtitle={name(shop)}
        actions={
          shops.length > 1 && (
            <div className="flex rounded-xl border border-line bg-surface p-1">
              {shops.map((s) => (
                <Link key={s.id} href={`/admin/pos?store=${s.id}`} className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", s.id === shop.id ? "bg-brand text-white" : "text-ink-2 hover:bg-mist")}>{name(s)}</Link>
              ))}
            </div>
          )
        }
      />

      <PosTill key={shop.id} storeId={shop.id} storeName={name(shop)} />

      <Panel
        title={T("مبيعات اليوم")}
        icon={Receipt}
        actions={<a href={`/api/admin/pos/closing?store=${shop.id}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm"><Printer className="h-4 w-4" aria-hidden="true" />{T("طباعة إغلاق الصندوق")}</a>}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label={T("المجموع")} value={eur(valid.reduce((n, s) => n + s.total, 0))} icon={Receipt} tone="bg-brand/15 text-brand" hint={T("{n} عملية بيع", { n: valid.length })} />
          <StatTile label={T("نقدًا")} value={eur(by("cash"))} icon={Banknote} tone="bg-ok-50 text-ok" />
          <StatTile label={T("بطاقة")} value={eur(by("card"))} icon={CreditCard} tone="bg-warn-50 text-warn" />
          <StatTile label={T("تحويل")} value={eur(by("transfer"))} icon={Landmark} tone="bg-mist text-ink-2" />
        </div>
        {sales.length > 0 && (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
            {sales.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
                <a href={`/api/admin/orders/${s.id}/invoice`} target="_blank" rel="noreferrer" className="font-mono font-semibold hover:text-brand" dir="ltr">{s.number}</a>
                <span className="text-muted">{time.format(s.at)}{s.seller ? ` · ${s.seller}` : ""}</span>
                <span className="chip bg-mist text-ink-2">{T(s.payment === "card" ? "بطاقة" : s.payment === "transfer" ? "تحويل" : "نقدًا")}</span>
                {s.status === "cancelled" && <span className="chip bg-hot-50 text-hot">{T("ملغى")}</span>}
                <span className="ms-auto font-bold tabular-nums" dir="ltr">{eur(s.total)}</span>
                <a href={`/api/admin/orders/${s.id}/invoice?format=receipt`} target="_blank" rel="noreferrer" className="text-muted hover:text-fg" aria-label={T("طباعة التذكرة")}><Printer className="h-4 w-4" /></a>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
