import { useId } from "react";
import type { ArtKind } from "@/lib/art";
import { shade } from "@/lib/color";

type Props = { kind: ArtKind; color?: string; className?: string };

/** Vector illustration used when a product has no photo yet. */
export function ProductArt({ kind, color = "#1c1c1e", className }: Props) {
  const id = useId().replace(/:/g, "");
  const hi = shade(color, 0.28);
  const lo = shade(color, -0.35);
  const body = `url(#b${id})`;
  const screen = `url(#s${id})`;

  const defs = (
    <defs>
      <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={hi} />
        <stop offset="1" stopColor={lo} />
      </linearGradient>
      <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#1a0709" />
        <stop offset="0.55" stopColor="#8a0f23" />
        <stop offset="1" stopColor="#ef2b3f" />
      </linearGradient>
      <radialGradient id={`g${id}`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" style={{ stopColor: "var(--art-glow, #fff)", stopOpacity: "var(--art-glow-op, 0.55)" }} />
        <stop offset="1" style={{ stopColor: "var(--art-glow, #fff)", stopOpacity: 0 }} />
      </radialGradient>
      <filter id={`f${id}`} x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#0b0d12" floodOpacity="0.22" />
      </filter>
    </defs>
  );

  const lens = (cx: number, cy: number, r = 7) => (
    <g key={`${cx}-${cy}`}>
      <circle cx={cx} cy={cy} r={r + 2.5} fill={lo} />
      <circle cx={cx} cy={cy} r={r} fill="#0b0d12" />
      <circle cx={cx - r * 0.3} cy={cy - r * 0.3} r={r * 0.28} fill="#fff" opacity="0.55" />
    </g>
  );

  let art: React.ReactNode;
  switch (kind) {
    case "phone":
      art = (
        <g filter={`url(#f${id})`}>
          <g transform="rotate(-9 95 130)">
            <rect x="48" y="30" width="92" height="190" rx="20" fill={body} />
            <rect x="48" y="30" width="92" height="190" rx="20" fill="none" stroke="#fff" strokeOpacity="0.25" />
            <rect x="58" y="40" width="40" height="46" rx="12" fill={lo} opacity="0.55" />
            {lens(72, 55)}
            {lens(72, 74)}
            {lens(89, 64.5, 6)}
          </g>
          <g transform="rotate(7 150 130)">
            <rect x="104" y="22" width="96" height="200" rx="22" fill="#0b0d12" />
            <rect x="104" y="22" width="96" height="200" rx="22" fill="none" stroke={hi} strokeWidth="2" />
            <rect x="109" y="27" width="86" height="190" rx="17" fill={screen} />
            <circle cx="152" cy="38" r="4.5" fill="#0b0d12" />
            <rect x="124" y="108" width="56" height="7" rx="3.5" fill="#fff" opacity="0.85" />
            <rect x="136" y="122" width="32" height="5" rx="2.5" fill="#fff" opacity="0.45" />
          </g>
        </g>
      );
      break;
    case "tablet":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="30" y="48" width="180" height="144" rx="16" fill={body} />
          <rect x="30" y="48" width="180" height="144" rx="16" fill="none" stroke="#fff" strokeOpacity="0.3" />
          <rect x="38" y="56" width="164" height="128" rx="10" fill={screen} />
          <circle cx="120" cy="52" r="1.8" fill="#0b0d12" opacity="0.6" />
          <rect x="62" y="104" width="76" height="8" rx="4" fill="#fff" opacity="0.85" />
          <rect x="62" y="120" width="48" height="6" rx="3" fill="#fff" opacity="0.45" />
        </g>
      );
      break;
    case "watch":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="92" y="14" width="56" height="64" rx="12" fill={body} />
          <rect x="92" y="162" width="56" height="64" rx="12" fill={body} />
          <rect x="62" y="64" width="116" height="112" rx="34" fill={shade(color, -0.2)} />
          <rect x="62" y="64" width="116" height="112" rx="34" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
          <rect x="70" y="72" width="100" height="96" rx="27" fill="#0b0d12" />
          <circle cx="120" cy="120" r="30" fill="none" stroke="#ef2b3f" strokeWidth="6" />
          <circle cx="120" cy="120" r="19" fill="none" stroke="#ffffff" strokeWidth="5" strokeDasharray="60 80" />
          <rect x="178" y="98" width="8" height="22" rx="4" fill={hi} />
        </g>
      );
      break;
    case "earbuds":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="52" y="128" width="136" height="82" rx="34" fill={body} />
          <rect x="52" y="128" width="136" height="82" rx="34" fill="none" stroke="#fff" strokeOpacity="0.35" />
          <path d="M52 166h136" stroke={lo} strokeWidth="2" opacity="0.5" />
          <circle cx="120" cy="190" r="3.5" fill="#fff" opacity="0.7" />
          {[84, 156].map((x, i) => (
            <g key={x} transform={`rotate(${i ? 12 : -12} ${x} 70)`}>
              <rect x={x - 7} y="70" width="14" height="46" rx="7" fill={body} />
              <circle cx={x} cy="62" r="24" fill={body} />
              <circle cx={x} cy="62" r="24" fill="none" stroke="#fff" strokeOpacity="0.35" />
              <circle cx={x} cy="62" r="10" fill={lo} opacity="0.55" />
            </g>
          ))}
        </g>
      );
      break;
    case "headphones":
      art = (
        <g filter={`url(#f${id})`}>
          <path d="M50 140V118a70 70 0 0 1 140 0v22" fill="none" stroke={lo} strokeWidth="16" strokeLinecap="round" />
          <path d="M50 140V118a70 70 0 0 1 140 0v22" fill="none" stroke={hi} strokeWidth="5" strokeLinecap="round" opacity="0.7" />
          <rect x="32" y="122" width="40" height="84" rx="20" fill={body} />
          <rect x="168" y="122" width="40" height="84" rx="20" fill={body} />
          <rect x="32" y="122" width="40" height="84" rx="20" fill="none" stroke="#fff" strokeOpacity="0.3" />
          <rect x="168" y="122" width="40" height="84" rx="20" fill="none" stroke="#fff" strokeOpacity="0.3" />
          <circle cx="52" cy="164" r="9" fill={lo} opacity="0.5" />
          <circle cx="188" cy="164" r="9" fill={lo} opacity="0.5" />
        </g>
      );
      break;
    case "laptop":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="52" y="46" width="136" height="100" rx="9" fill={body} />
          <rect x="58" y="52" width="124" height="88" rx="5" fill={screen} />
          <circle cx="120" cy="49" r="1.6" fill="#0b0d12" opacity="0.6" />
          <path d="M26 152h188l-9 22a9 9 0 0 1-8 5H43a9 9 0 0 1-8-5z" fill={body} />
          <rect x="104" y="152" width="32" height="5" rx="2.5" fill={lo} opacity="0.5" />
        </g>
      );
      break;
    case "cable":
      art = (
        <g filter={`url(#f${id})`}>
          <path d="M70 60c-60 20-30 80 20 100s90 40 80 10" fill="none" stroke={body} strokeWidth="9" strokeLinecap="round" />
          <rect x="54" y="38" width="34" height="30" rx="8" fill="#dfe2e8" transform="rotate(-18 71 53)" />
          <rect x="62" y="30" width="18" height="12" rx="3" fill="#8b909c" transform="rotate(-18 71 36)" />
          <rect x="150" y="166" width="34" height="30" rx="8" fill="#dfe2e8" transform="rotate(20 167 181)" />
          <rect x="158" y="190" width="18" height="12" rx="3" fill="#8b909c" transform="rotate(20 167 196)" />
        </g>
      );
      break;
    case "case":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="68" y="20" width="104" height="200" rx="26" fill={body} />
          <rect x="68" y="20" width="104" height="200" rx="26" fill="none" stroke="#fff" strokeOpacity="0.3" />
          <rect x="78" y="30" width="48" height="52" rx="14" fill={lo} opacity="0.55" />
          {lens(94, 46)}
          {lens(94, 66)}
          {lens(112, 56, 6)}
          <circle cx="120" cy="150" r="26" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" />
        </g>
      );
      break;
    case "powerbank":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="70" y="22" width="100" height="196" rx="22" fill={body} />
          <rect x="70" y="22" width="100" height="196" rx="22" fill="none" stroke="#fff" strokeOpacity="0.3" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={92 + i * 16} y="48" width="10" height="5" rx="2.5" fill={i < 3 ? "#38d996" : "#fff"} opacity={i < 3 ? 1 : 0.4} />
          ))}
          <rect x="102" y="196" width="36" height="9" rx="4.5" fill="#0b0d12" opacity="0.7" />
        </g>
      );
      break;
    case "band":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="100" y="14" width="40" height="70" rx="12" fill={body} />
          <rect x="100" y="156" width="40" height="70" rx="12" fill={body} />
          <rect x="82" y="72" width="76" height="96" rx="24" fill={shade(color, -0.2)} />
          <rect x="82" y="72" width="76" height="96" rx="24" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <rect x="88" y="78" width="64" height="84" rx="19" fill="#0b0d12" />
          <rect x="100" y="104" width="40" height="8" rx="4" fill="#ff4d5e" />
          <rect x="100" y="122" width="26" height="6" rx="3" fill="#fff" opacity="0.6" />
        </g>
      );
      break;
    case "speaker":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="30" y="84" width="180" height="88" rx="44" fill={body} />
          <rect x="30" y="84" width="180" height="88" rx="44" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <circle cx="86" cy="128" r="26" fill={lo} opacity="0.6" />
          <circle cx="154" cy="128" r="26" fill={lo} opacity="0.6" />
          <circle cx="86" cy="128" r="12" fill="#0b0d12" opacity="0.7" />
          <circle cx="154" cy="128" r="12" fill="#0b0d12" opacity="0.7" />
          <rect x="100" y="92" width="40" height="6" rx="3" fill="#fff" opacity="0.6" />
          <path d="M210 128c14 0 14 26 0 26" fill="none" stroke={lo} strokeWidth="7" strokeLinecap="round" />
        </g>
      );
      break;
    case "soundbar":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="14" y="100" width="212" height="44" rx="22" fill={body} />
          <rect x="14" y="100" width="212" height="44" rx="22" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <rect x="34" y="112" width="172" height="20" rx="10" fill="#0b0d12" opacity="0.6" />
          {Array.from({ length: 12 }).map((_, i) => (
            <circle key={i} cx={46 + i * 13.5} cy="122" r="2.4" fill="#fff" opacity="0.35" />
          ))}
          <circle cx="120" cy="106" r="2" fill="#ff4d5e" />
          <rect x="34" y="144" width="18" height="6" rx="3" fill={lo} />
          <rect x="188" y="144" width="18" height="6" rx="3" fill={lo} />
        </g>
      );
      break;
    case "holder":
      art = (
        <g filter={`url(#f${id})`}>
          <circle cx="120" cy="208" r="20" fill={lo} />
          <circle cx="120" cy="208" r="12" fill={body} />
          <rect x="113" y="132" width="14" height="76" rx="7" fill={body} />
          <rect x="70" y="22" width="100" height="118" rx="16" fill={body} />
          <rect x="76" y="28" width="88" height="106" rx="11" fill="#0b0d12" />
          <rect x="82" y="34" width="76" height="94" rx="8" fill={screen} />
          <rect x="60" y="62" width="10" height="34" rx="4" fill={lo} />
          <rect x="170" y="62" width="10" height="34" rx="4" fill={lo} />
        </g>
      );
      break;
    case "monitor":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="24" y="38" width="192" height="122" rx="9" fill={body} />
          <rect x="30" y="44" width="180" height="104" rx="5" fill={screen} />
          <path d="M30 128c36-22 66-6 104-20s52-8 76-22v62H30Z" fill="#000" opacity="0.26" />
          <rect x="108" y="160" width="24" height="28" fill={lo} />
          <path d="M72 204c0-10 12-16 48-16s48 6 48 16Z" fill={body} />
        </g>
      );
      break;
    case "ebike":
      art = (
        <g filter={`url(#f${id})`}>
          <circle cx="60" cy="168" r="36" fill="none" stroke="#0b0d12" strokeWidth="7" />
          <circle cx="180" cy="168" r="36" fill="none" stroke="#0b0d12" strokeWidth="7" />
          <circle cx="60" cy="168" r="6" fill={hi} />
          <circle cx="180" cy="168" r="6" fill={hi} />
          <path d="M60 168 106 104h52l22 64M106 104l18 64h-64M158 104l-4-40" fill="none" stroke={body} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="84" y="90" width="34" height="9" rx="4.5" fill="#0b0d12" />
          <rect x="140" y="56" width="30" height="8" rx="4" fill="#0b0d12" />
          <rect x="96" y="118" width="46" height="14" rx="6" fill={lo} transform="rotate(-14 119 125)" />
          <circle cx="124" cy="168" r="9" fill={lo} />
        </g>
      );
      break;
    case "fridge":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="64" y="14" width="112" height="212" rx="14" fill={body} />
          <rect x="64" y="14" width="112" height="212" rx="14" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <path d="M64 92h112" stroke={lo} strokeWidth="3" />
          <rect x="80" y="44" width="6" height="30" rx="3" fill={lo} />
          <rect x="80" y="110" width="6" height="52" rx="3" fill={lo} />
          <rect x="108" y="28" width="30" height="6" rx="3" fill="#0b0d12" opacity="0.6" />
        </g>
      );
      break;
    case "coffee":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="62" y="24" width="116" height="170" rx="16" fill={body} />
          <rect x="62" y="24" width="116" height="170" rx="16" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <rect x="82" y="40" width="76" height="30" rx="8" fill="#0b0d12" opacity="0.75" />
          <circle cx="98" cy="55" r="5" fill="#ff4d5e" />
          <rect x="102" y="96" width="36" height="26" rx="6" fill={lo} />
          <rect x="108" y="124" width="24" height="12" rx="3" fill="#0b0d12" opacity="0.55" />
          <rect x="104" y="146" width="32" height="30" rx="6" fill="#f4f4f6" />
          <path d="M136 154c12 0 12 16 0 16" fill="none" stroke="#f4f4f6" strokeWidth="5" strokeLinecap="round" />
          <rect x="54" y="190" width="132" height="16" rx="8" fill={lo} />
        </g>
      );
      break;
    case "airfryer":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="52" y="40" width="136" height="152" rx="44" fill={body} />
          <rect x="52" y="40" width="136" height="152" rx="44" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <rect x="92" y="62" width="56" height="20" rx="7" fill="#0b0d12" opacity="0.8" />
          <circle cx="104" cy="72" r="3" fill="#ff4d5e" />
          <circle cx="120" cy="104" r="12" fill={lo} />
          <rect x="82" y="138" width="76" height="16" rx="8" fill="#0b0d12" opacity="0.75" />
          <rect x="70" y="196" width="22" height="9" rx="4" fill={lo} />
          <rect x="148" y="196" width="22" height="9" rx="4" fill={lo} />
        </g>
      );
      break;
    case "console":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="72" y="18" width="96" height="196" rx="30" fill={body} />
          <rect x="72" y="18" width="96" height="196" rx="30" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
          <rect x="104" y="18" width="32" height="196" fill="#0b0d12" opacity="0.88" />
          <rect x="118" y="36" width="4" height="150" rx="2" fill="#3da9ff" />
          <rect x="94" y="224" width="52" height="8" rx="4" fill="#000" opacity="0.18" />
        </g>
      );
      break;
    case "gamepad":
      art = (
        <g filter={`url(#f${id})`}>
          <path d="M62 160c-18 0-34-30-26-58 7-24 26-38 50-38h68c24 0 43 14 50 38 8 28-8 58-26 58-16 0-24-16-38-26H100c-14 10-22 26-38 26Z" fill={body} />
          <path d="M62 160c-18 0-34-30-26-58 7-24 26-38 50-38h68c24 0 43 14 50 38 8 28-8 58-26 58-16 0-24-16-38-26H100c-14 10-22 26-38 26Z" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <circle cx="84" cy="106" r="15" fill="#0b0d12" />
          <circle cx="84" cy="106" r="7" fill={hi} opacity="0.5" />
          <circle cx="136" cy="128" r="15" fill="#0b0d12" />
          <circle cx="136" cy="128" r="7" fill={hi} opacity="0.5" />
          <path d="M104 112h14M111 105v14" stroke="#0b0d12" strokeWidth="8" strokeLinecap="round" opacity="0.8" />
          {[[166, 96], [180, 108], [166, 120], [152, 108]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5.5" fill={["#ff4d5e", "#3da9ff", "#38d996", "#ffd24d"][i]} />
          ))}
        </g>
      );
      break;
    case "camera":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="34" y="78" width="172" height="112" rx="18" fill={body} />
          <rect x="34" y="78" width="172" height="112" rx="18" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <rect x="86" y="58" width="62" height="26" rx="9" fill={body} />
          <rect x="160" y="64" width="26" height="10" rx="5" fill={hi} />
          <rect x="48" y="92" width="24" height="12" rx="4" fill={lo} />
          <circle cx="120" cy="136" r="44" fill={lo} />
          <circle cx="120" cy="136" r="34" fill="#0b0d12" />
          <circle cx="120" cy="136" r="20" fill="#1c2540" />
          <circle cx="110" cy="126" r="7" fill="#fff" opacity="0.5" />
        </g>
      );
      break;
    case "drone":
      art = (
        <g filter={`url(#f${id})`}>
          <path d="M120 120 46 78M120 120l74-42M120 120 50 170M120 120l70 50" stroke={lo} strokeWidth="9" strokeLinecap="round" />
          {[[44, 74], [196, 74], [48, 174], [192, 174]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="9" fill={body} />
              <ellipse cx={x} cy={y - 6} rx="32" ry="6" fill="#0b0d12" opacity="0.35" />
            </g>
          ))}
          <rect x="94" y="100" width="52" height="40" rx="16" fill={body} />
          <rect x="94" y="100" width="52" height="40" rx="16" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <circle cx="120" cy="154" r="11" fill="#0b0d12" />
          <circle cx="120" cy="154" r="5" fill={hi} opacity="0.7" />
        </g>
      );
      break;
    case "keyboard":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="18" y="84" width="204" height="92" rx="12" fill={body} />
          <rect x="18" y="84" width="204" height="92" rx="12" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          {[0, 1, 2].map((r) =>
            Array.from({ length: 12 }).map((_, c) => (
              <rect key={`${r}-${c}`} x={28 + c * 15.7} y={94 + r * 19} width="12.5" height="14" rx="3" fill={lo} opacity="0.55" />
            )),
          )}
          <rect x="62" y="152" width="116" height="14" rx="4" fill={lo} opacity="0.55" />
        </g>
      );
      break;
    case "mouse":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="84" y="40" width="72" height="160" rx="36" fill={body} />
          <rect x="84" y="40" width="72" height="160" rx="36" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <path d="M120 40v62" stroke={lo} strokeWidth="3" />
          <rect x="114" y="58" width="12" height="28" rx="6" fill="#0b0d12" />
          <rect x="84" y="108" width="72" height="6" fill={lo} opacity="0.4" />
          <rect x="82" y="124" width="8" height="24" rx="4" fill={hi} opacity="0.6" />
        </g>
      );
      break;
    case "ssd":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="58" y="64" width="124" height="112" rx="20" fill={body} />
          <rect x="58" y="64" width="124" height="112" rx="20" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <rect x="58" y="108" width="124" height="14" fill={lo} opacity="0.5" />
          <circle cx="86" cy="86" r="6" fill="#ff4d5e" />
          <rect x="98" y="176" width="44" height="14" rx="4" fill="#cfd3da" />
        </g>
      );
      break;
    case "printer":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="68" y="34" width="104" height="62" rx="5" fill="#f4f4f6" />
          <path d="M80 52h80M80 64h60M80 76h70" stroke="#c9ccd4" strokeWidth="4" strokeLinecap="round" />
          <rect x="30" y="92" width="180" height="82" rx="16" fill={body} />
          <rect x="30" y="92" width="180" height="82" rx="16" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <rect x="146" y="106" width="44" height="14" rx="4" fill="#0b0d12" opacity="0.8" />
          <circle cx="156" cy="113" r="2.5" fill="#38d996" />
          <rect x="74" y="150" width="92" height="54" rx="4" fill="#f4f4f6" />
          <path d="M86 168h68M86 180h50" stroke="#c9ccd4" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
      break;
    case "bulb":
      art = (
        <g filter={`url(#f${id})`}>
          <circle cx="120" cy="104" r="64" fill="#ffd9a0" opacity="0.28" />
          <circle cx="120" cy="100" r="44" fill={body} />
          <circle cx="120" cy="100" r="44" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" />
          <path d="M104 96c6-14 26-14 32 0" stroke="#fff" strokeOpacity="0.7" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M104 138h32l-4 14h-24Z" fill={lo} />
          <rect x="100" y="152" width="40" height="12" rx="3" fill="#cfd3da" />
          <rect x="104" y="164" width="32" height="10" rx="3" fill="#9aa0ab" />
          <path d="M112 174h16l-3 8h-10Z" fill="#6c7280" />
        </g>
      );
      break;
    case "ipcam":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="96" y="176" width="48" height="22" rx="8" fill={lo} />
          <rect x="112" y="150" width="16" height="30" rx="5" fill={lo} />
          <circle cx="120" cy="104" r="52" fill={body} />
          <circle cx="120" cy="104" r="52" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
          <circle cx="120" cy="104" r="32" fill="#0b0d12" />
          <circle cx="120" cy="104" r="19" fill="#1c2540" />
          <circle cx="112" cy="96" r="6" fill="#fff" opacity="0.5" />
          <circle cx="120" cy="64" r="3" fill="#ff4d5e" />
        </g>
      );
      break;
    case "tv":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="22" y="52" width="196" height="122" rx="9" fill={body} />
          <rect x="27" y="57" width="186" height="112" rx="5" fill={screen} />
          <path d="M27 150c40-26 70-8 110-24s56-10 76-26v69H27Z" fill="#000" opacity="0.28" />
          <rect x="108" y="174" width="24" height="22" fill={lo} />
          <rect x="74" y="194" width="92" height="9" rx="4.5" fill={body} />
        </g>
      );
      break;
    case "scooter":
      art = (
        <g filter={`url(#f${id})`}>
          <path d="M176 186 150 60" stroke={lo} strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M176 186 150 60" stroke={hi} strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.6" />
          <rect x="132" y="48" width="46" height="9" rx="4.5" fill={body} />
          <rect x="52" y="178" width="124" height="13" rx="6.5" fill={body} />
          <rect x="52" y="178" width="124" height="13" rx="6.5" fill="none" stroke="#fff" strokeOpacity="0.3" />
          <circle cx="66" cy="196" r="20" fill="#0b0d12" />
          <circle cx="66" cy="196" r="9" fill={body} />
          <circle cx="178" cy="196" r="20" fill="#0b0d12" />
          <circle cx="178" cy="196" r="9" fill={body} />
          <circle cx="178" cy="64" r="3.5" fill="#ff4d5e" />
        </g>
      );
      break;
    case "vacuum":
      art = (
        <g filter={`url(#f${id})`}>
          <ellipse cx="120" cy="196" rx="76" ry="10" fill="#000" opacity="0.18" />
          <circle cx="120" cy="130" r="76" fill={body} />
          <circle cx="120" cy="130" r="76" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <circle cx="120" cy="130" r="58" fill="none" stroke={lo} strokeOpacity="0.5" strokeWidth="2" />
          <circle cx="120" cy="104" r="14" fill="#0b0d12" />
          <circle cx="120" cy="104" r="6" fill={hi} opacity="0.7" />
          <circle cx="120" cy="152" r="9" fill="#0b0d12" />
          <rect x="94" y="176" width="52" height="6" rx="3" fill="#0b0d12" opacity="0.55" />
        </g>
      );
      break;
    case "stick":
      art = (
        <g filter={`url(#f${id})`}>
          <ellipse cx="120" cy="214" rx="70" ry="7" fill="#000" opacity="0.18" />
          <rect x="102" y="18" width="30" height="24" rx="10" fill="#0b0d12" opacity="0.8" />
          <rect x="106" y="40" width="22" height="96" rx="9" fill={body} />
          <rect x="106" y="40" width="22" height="96" rx="9" fill="none" stroke="#fff" strokeOpacity="0.3" />
          <rect x="110" y="136" width="14" height="52" rx="4" fill={lo} />
          <rect x="108" y="64" width="18" height="30" rx="6" fill={screen} opacity="0.9" />
          <path d="M78 188h84a14 14 0 0 1 14 14v4H64v-4a14 14 0 0 1 14-14z" fill={body} />
          <path d="M78 188h84a14 14 0 0 1 14 14v4H64v-4a14 14 0 0 1 14-14z" fill="none" stroke="#fff" strokeOpacity="0.3" />
          <rect x="64" y="202" width="112" height="5" rx="2.5" fill="#0b0d12" opacity="0.6" />
        </g>
      );
      break;
    case "appliance":
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="58" y="26" width="124" height="190" rx="16" fill={body} />
          <rect x="58" y="26" width="124" height="190" rx="16" fill="none" stroke="#fff" strokeOpacity="0.3" />
          <rect x="70" y="40" width="48" height="14" rx="5" fill="#0b0d12" opacity="0.75" />
          <circle cx="146" cy="47" r="8" fill={lo} />
          <circle cx="120" cy="136" r="48" fill={lo} opacity="0.55" />
          <circle cx="120" cy="136" r="40" fill={screen} />
          <circle cx="120" cy="136" r="40" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="3" />
          <path d="M96 118c14-8 30-6 44 4" stroke="#fff" strokeOpacity="0.4" strokeWidth="4" strokeLinecap="round" fill="none" />
        </g>
      );
      break;
    default:
      art = (
        <g filter={`url(#f${id})`}>
          <rect x="66" y="52" width="108" height="112" rx="22" fill={body} />
          <rect x="66" y="52" width="108" height="112" rx="22" fill="none" stroke="#fff" strokeOpacity="0.35" />
          <rect x="106" y="22" width="9" height="32" rx="3" fill="#cfd3da" />
          <rect x="125" y="22" width="9" height="32" rx="3" fill="#cfd3da" />
          <rect x="104" y="96" width="32" height="14" rx="7" fill="#0b0d12" opacity="0.8" />
          <rect x="112" y="164" width="16" height="44" rx="6" fill={lo} />
        </g>
      );
  }

  return (
    <svg viewBox="0 0 240 240" className={className} role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      {defs}
      <circle cx="120" cy="124" r="96" fill={`url(#g${id})`} />
      {art}
    </svg>
  );
}
