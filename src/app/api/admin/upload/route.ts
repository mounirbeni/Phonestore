import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { can, getMember } from "@/lib/auth";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const member = await getMember();
  if (!member || !can(member.role, "catalog")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "not_configured" }, { status: 501 });
  }
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: "type" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "size" }, { status: 400 });
  const ext = file.type.split("/")[1];
  const blob = await put(`products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`, file, { access: "public", addRandomSuffix: false });
  return NextResponse.json({ url: blob.url });
}
