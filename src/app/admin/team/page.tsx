import { asc } from "drizzle-orm";
import { db } from "@/db";
import { staff } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { TeamManager } from "@/components/admin/team-manager";
import { getT } from "@/lib/admin-lang";
import { PageHeader } from "@/components/admin/ui";

export async function generateMetadata() {
  const T = await getT();
  return { title: T("الفريق") };
}

export default async function TeamPage() {
  const T = await getT();
  await requirePerm("team");
  const rows = await db.select().from(staff).orderBy(asc(staff.role), asc(staff.name));
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader title={T("الفريق")} subtitle={T("كل عضو يدخل ببريده وكلمة مروره، ويرى فقط ما يخص دوره.")} />
      <TeamManager
        members={rows.map((m) => ({ id: m.id, name: m.name, email: m.email, phone: m.phone, role: m.role, active: m.active, lastLoginAt: m.lastLoginAt?.toISOString() ?? null }))}
      />
    </div>
  );
}
