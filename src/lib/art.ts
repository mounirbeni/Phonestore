export type ArtKind =
  | "phone"
  | "tablet"
  | "watch"
  | "earbuds"
  | "headphones"
  | "laptop"
  | "charger"
  | "cable"
  | "case"
  | "powerbank"
  | "tv"
  | "scooter"
  | "appliance"
  | "vacuum";

/** Chooses a placeholder illustration for products that have no photo yet. */
export function artKind(name: string, categoryIcon: string): ArtKind {
  const n = name.toLowerCase();
  switch (categoryIcon) {
    case "phone":
      return "phone";
    case "tablet":
      return "tablet";
    case "watch":
      return "watch";
    case "laptop":
      return "laptop";
    case "tv":
      return "tv";
    case "scooter":
      return "scooter";
    case "home":
      return /robot|aspirateur|vacuum/.test(n) ? "vacuum" : "appliance";
    case "audio":
      return /buds|airpods|écouteur|ecouteur|earbud/.test(n) ? "earbuds" : "headphones";
    default:
      if (/coque|case|étui|etui/.test(n)) return "case";
      if (/câble|cable/.test(n)) return "cable";
      if (/power ?bank|batterie|externe/.test(n)) return "powerbank";
      return "charger";
  }
}
