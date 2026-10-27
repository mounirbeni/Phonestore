import { asc } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { TeamManager } from "@/components/admin/team-manager";

export const metadata = { title: "الفريق" };

export default async function TeamPage() {
  await requirePerm("team");
  const rows = await db.select().from(staff).orderBy(asc(staff.role), asc(staff.name));
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">الفريق</h1>
        <p className="mt-1 text-sm text-muted">كل عضو يدخل ببريده وكلمة مروره، ويرى فقط ما يخص دوره.</p>
      </div>
      <TeamManager
        members={rows.map((m) => ({ id: m.id, name: m.name, email: m.email, phone: m.phone, role: m.role, active: m.active, lastLoginAt: m.lastLoginAt?.toISOString() ?? null }))}
      />
    </div>
  );
}
