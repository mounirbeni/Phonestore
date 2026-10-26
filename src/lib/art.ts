export const ART_KINDS = [
  "phone", "tablet", "watch", "band", "earbuds", "headphones", "speaker", "soundbar",
  "laptop", "charger", "cable", "case", "powerbank", "holder",
  "tv", "monitor", "scooter", "ebike", "vacuum", "stick", "appliance", "fridge", "coffee", "airfryer",
  "console", "gamepad", "camera", "drone", "keyboard", "mouse", "ssd", "printer", "bulb", "ipcam",
] as const;
export type ArtKind = (typeof ART_KINDS)[number];

const isArt = (v: string): v is ArtKind => (ART_KINDS as readonly string[]).includes(v);

/**
 * Picks the placeholder illustration for products without a photo. Leaf categories carry a precise
 * icon (e.g. "speaker"); the product name only refines it where one category holds two shapes.
 */
export function artKind(name: string, categoryIcon: string): ArtKind {
  const n = name.toLowerCase();
  if (categoryIcon === "keyboard" && /souris|mouse|mx master/.test(n)) return "mouse";
  if (categoryIcon === "vacuum" && !/robot/.test(n)) return "stick";
  if (categoryIcon === "console" && /manette|controller|dualsense/.test(n)) return "gamepad";
  if (isArt(categoryIcon)) return categoryIcon;
  switch (categoryIcon) {
    case "audio":
      return /buds|airpods|écouteur|ecouteur|earbud/.test(n) ? "earbuds" : "headphones";
    case "home":
      return /robot|aspirateur|vacuum/.test(n) ? "vacuum" : "appliance";
    default:
      if (/coque|case|étui|etui/.test(n)) return "case";
      if (/câble|cable/.test(n)) return "cable";
      if (/power ?bank|batterie|externe/.test(n)) return "powerbank";
      return "charger";
  }
}
