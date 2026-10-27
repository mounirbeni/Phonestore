import { requirePerm } from "@/lib/auth";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eur } from "@/lib/admin-ui";
import { CouponManager } from "@/components/admin/coupon-manager";

export const metadata = { title: "أكواد الخصم" };

export default async function CouponsPage() {
  await requirePerm("coupons");
  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-2xl font-extrabold">أكواد الخصم</h1>
      <CouponManager
        coupons={rows.map((c) => ({
          id: c.id,
          code: c.code,
          label: c.percent ? `${c.percent}%` : eur(c.amountOff ?? 0),
          minSubtotal: eur(c.minSubtotal),
          usedCount: c.usedCount,
          maxUses: c.maxUses,
          active: c.active,
        }))}
      />
    </div>
  );
}
