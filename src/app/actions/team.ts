"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { staff, STAFF_ROLES } from "@/db/schema";
import { requirePerm } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

const memberSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().toLowerCase().email().max(120),
  phone: z.string().trim().max(30).default(""),
  role: z.enum(STAFF_ROLES),
  /** Required for a new member; when editing, empty keeps the current password. */
  password: z.string().max(100).default(""),
});

export async function saveMember(input: z.input<typeof memberSchema>): Promise<{ ok: boolean; error?: string }> {
  await requirePerm("team");
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "تحقق من الاسم والبريد الإلكتروني" };
  const m = parsed.data;
  if ((!m.id || m.password) && m.password.length < 8) return { ok: false, error: "كلمة المرور 8 أحرف على الأقل" };
  const [clash] = await db
    .select({ id: staff.id })
    .from(staff)
    .where(m.id ? and(eq(staff.email, m.email), ne(staff.id, m.id)) : eq(staff.email, m.email))
    .limit(1);
  if (clash) return { ok: false, error: "هذا البريد الإلكتروني مستخدم لعضو آخر" };
  const values = { name: m.name, email: m.email, phone: m.phone, role: m.role, ...(m.password ? { passwordHash: await hashPassword(m.password) } : {}) };
  // Any edit by the owner (password, role, e-mail) signs the member out so the change applies at once.
  if (m.id) await db.update(staff).set({ ...values, sessionVersion: sql`${staff.sessionVersion} + 1` }).where(eq(staff.id, m.id));
  else await db.insert(staff).values({ ...values, passwordHash: values.passwordHash! });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setMemberActive(id: number, active: boolean) {
  await requirePerm("team");
  await db.update(staff).set({ active }).where(eq(staff.id, id));
  revalidatePath("/admin", "layout");
}

/** Orders and history keep working: their links to the member are cleared, the names in the history stay. */
export async function deleteMember(id: number) {
  await requirePerm("team");
  await db.delete(staff).where(eq(staff.id, id));
  revalidatePath("/admin", "layout");
}
