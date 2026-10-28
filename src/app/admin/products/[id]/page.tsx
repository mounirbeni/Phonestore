import { requirePerm } from "@/lib/auth";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, variants } from "@/db/schema";
import { ProductForm, type ProductFormInitial } from "@/components/admin/product-form";
import { getT } from "@/lib/admin-lang";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const T = await getT();
  return { title: id === "new" ? T("منتج جديد") : T("تعديل منتج") };
}

export default async function EditProduct({ params }: Props) {
  const T = await getT();
  await requirePerm("catalog");
  const { id } = await params;
  const all = await db.select().from(categories).orderBy(asc(categories.sort), asc(categories.id));
  // Only the most precise categories can hold products; sub-categories are grouped under their family.
  const hasKids = new Set(all.map((c) => c.parentId).filter((x): x is number => x != null));
  const groups = all
    .filter((c) => c.parentId == null)
    .map((top) => ({
      label: hasKids.has(top.id) ? (T.lang === "fr" ? top.nameFr : top.nameAr) : null,
      items: (hasKids.has(top.id) ? all.filter((c) => c.parentId === top.id) : [top]).map((c) => ({ id: c.id, nameAr: T.lang === "fr" ? c.nameFr : c.nameAr })),
    }))
    .filter((g) => g.items.length > 0);
  const cats = groups.flatMap((g) => g.items);
  if (!cats.length) return <p className="rounded-2xl bg-surface p-8 text-center">{T("أنشئ فئة أولًا من صفحة «الفئات».")}</p>;

  let initial: ProductFormInitial;
  if (id === "new") {
    initial = {
      name: "", slug: "", brand: "", categoryId: cats[0].id, shortFr: "", shortAr: "", descFr: "", descAr: "",
      images: [], specsText: "", featured: false, isNew: true, active: true, warrantyMonths: 12, condition: "new",
      variants: [{ sku: "", colorFr: "", colorAr: "", colorHex: "#1c1c1e", storage: "", price: "", compareAt: "", stock: "10" }],
    };
  } else {
    const pid = parseInt(id, 10);
    if (!Number.isInteger(pid)) notFound();
    const [p] = await db.select().from(products).where(eq(products.id, pid)).limit(1);
    if (!p) notFound();
    const vs = await db.select().from(variants).where(eq(variants.productId, pid)).orderBy(asc(variants.sort), asc(variants.id));
    initial = {
      id: p.id, name: p.name, slug: p.slug, brand: p.brand, categoryId: p.categoryId,
      shortFr: p.shortFr, shortAr: p.shortAr, descFr: p.descFr, descAr: p.descAr,
      images: p.images, specsText: p.specs.map((s) => `${s.fr} | ${s.ar} | ${s.value}`).join("\n"),
      featured: p.featured, isNew: p.isNew, active: p.active, warrantyMonths: p.warrantyMonths, condition: p.condition,
      variants: vs.map((v) => ({
        id: v.id, sku: v.sku, colorFr: v.colorFr, colorAr: v.colorAr, colorHex: v.colorHex, storage: v.storage,
        price: String(v.price / 100), compareAt: v.compareAtPrice ? String(v.compareAtPrice / 100) : "", stock: String(v.stock),
      })),
    };
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="text-2xl font-extrabold">{id === "new" ? T("منتج جديد") : T("تعديل المنتج")}</h1>
      <ProductForm initial={initial} categories={groups} />
    </div>
  );
}
