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
