import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { can, getMember } from "@/lib/auth";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX = 5 * 1024 * 1024;

function looksLike(type: string, b: Uint8Array) {
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (type === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === "image/png") return b[0] === 0x89 && ascii(1, 4) === "PNG";
  if (type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  if (type === "image/avif") return ascii(4, 8) === "ftyp" && ascii(8, 12).startsWith("avi");
  return false;
}

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
  // The declared type comes from the browser; check the file really starts like that image format.
  if (!looksLike(file.type, new Uint8Array(await file.slice(0, 16).arrayBuffer()))) return NextResponse.json({ error: "type" }, { status: 400 });
  const ext = file.type.split("/")[1];
  const blob = await put(`products/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`, file, { access: "public", addRandomSuffix: false });
  return NextResponse.json({ url: blob.url });
}
