"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { can, requirePerm } from "@/lib/auth";
import { setSerials } from "@/lib/warranty";

const schema = z.object({
  orderId: z.number().int().positive(),
  lines: z.array(z.object({ itemId: z.number().int().positive(), serials: z.array(z.string().trim().max(40)).max(50) })).max(40),
});

/** Saves the IMEI / serial numbers typed on the order page (one per unit). */
export async function saveSerials(input: z.input<typeof schema>): Promise<{ ok: boolean }> {
  const m = await requirePerm("warranties");
  if (!can(m.role, "orders")) return { ok: false };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false };
  for (const l of parsed.data.lines) await setSerials(parsed.data.orderId, l.itemId, l.serials);
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { ok: true };
}
