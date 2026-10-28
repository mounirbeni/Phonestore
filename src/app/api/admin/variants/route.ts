import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, variants } from "@/db/schema";
import { can, getMember } from "@/lib/auth";
import { csvResponse, dh } from "@/lib/csv";

/** Every variant with its price and stock, to edit in Excel and import back. */
export async function GET() {
  const member = await getMember();
  if (!member || !can(member.role, "catalog")) return new Response("unauthorized", { status: 401 });
  const rows = await db
    .select({ v: variants, name: products.name, brand: products.brand })
    .from(variants)
    .innerJoin(products, eq(variants.productId, products.id))
    .orderBy(asc(products.name), asc(variants.sort), asc(variants.id));
  return csvResponse(
    `stock-prix-${new Date().toISOString().slice(0, 10)}.csv`,
    ["id", "sku", "produit", "marque", "variante", "prix (DH)", "prix barré (DH)", "stock"],
    rows.map(({ v, name, brand }) => [v.id, v.sku, name, brand, [v.colorFr, v.storage].filter(Boolean).join(" · "), dh(v.price), v.compareAtPrice ? dh(v.compareAtPrice) : "", v.stock]),
  );
}
