import { ImageResponse } from "next/og";

const SIZES = [180, 192, 512];

export function generateStaticParams() {
  return SIZES.map((s) => ({ size: String(s) }));
}

export const dynamic = "force-static";

/** App icon: crimson bolt on black. Full-bleed so it also works as a maskable icon. */
export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const n = SIZES.includes(Number(size)) ? Number(size) : 512;
  const tile = Math.round(n * 0.62);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0b" }}>
        <div
          style={{
            width: tile,
            height: tile,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: Math.round(tile * 0.26),
            background: "linear-gradient(135deg, #e0112b 0%, #7d0a1c 100%)",
          }}
        >
          <svg width={Math.round(tile * 0.56)} height={Math.round(tile * 0.56)} viewBox="0 0 24 24" fill="#ffffff">
            <path d="M13.2 2.5 5 13.2c-.4.5 0 1.3.7 1.3h4.6l-1 7c-.1.8.9 1.2 1.4.6L19 10.8c.4-.5 0-1.3-.7-1.3h-4.5l.9-6.2c.1-.8-.9-1.2-1.5-.8Z" />
          </svg>
        </div>
      </div>
    ),
    { width: n, height: n },
  );
}
