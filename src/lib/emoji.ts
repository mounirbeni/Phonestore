/** Pictographs, dingbats and arrows used as decoration in imported text (™ and plain punctuation are kept). */
export const EMOJI_RE = /(?:[\u{1F000}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{2B05}-\u{2B55}]|[\u{2300}-\u{23FF}]|\u{203C}|\u{2049}|\u{2139}|[\u{2194}-\u{21AA}])\u{FE0F}?|\u{FE0F}|\u{200D}/gu;

/** Removes decorative emoji and the spaces they leave behind. */
export const stripEmoji = (s: string) => s.replace(EMOJI_RE, "").replace(/[ \t]{2,}/g, " ").replace(/^[ \t]+/gm, "").trim();

/** True when a line was introduced by an emoji (used as a bullet or a heading marker). */
export const startsWithEmoji = (s: string) => new RegExp(`^\\s*(?:${EMOJI_RE.source})`, "u").test(s);

/** Marks that mean "no / not included" in imported descriptions. */
export const startsWithCross = (s: string) => /^\s*(?:❌|🚫|✖|⛔|🛑)/u.test(s);
