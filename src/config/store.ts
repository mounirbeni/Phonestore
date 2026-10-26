export const store = {
  name: process.env.NEXT_PUBLIC_STORE_NAME ?? "ElectroSalam",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  currency: "MAD",
  /** Orders at or above this subtotal (in cents) ship for free (standard shipping). */
  freeShippingThreshold: 50000,
  /** Highest quantity of a single variant per order. */
  maxQtyPerLine: 10,
  /** Categories that first ask "new or used?" and then the brand. */
  conditionCategories: ["telephones"] as string[],
  shippingMethods: [
    { id: "standard", cents: 3000, minDays: 2, maxDays: 4 },
    { id: "express", cents: 5000, minDays: 1, maxDays: 2 },
  ],
  countries: [{ code: "MA", fr: "Maroc", ar: "المغرب" }],

  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@electrosalam.example",
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+212 5 00 00 00 00",
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "",
    address: process.env.NEXT_PUBLIC_ADDRESS ?? "Adresse de la société, Casablanca, Maroc",
    legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "ElectroSalam SAS",
  },
} as const;

export type ShippingMethodId = (typeof store.shippingMethods)[number]["id"];
export const countryCodes = store.countries.map((c) => c.code) as [string, ...string[]];
