export const store = {
  name: process.env.NEXT_PUBLIC_STORE_NAME ?? "PhoneStore",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  currency: "EUR",
  /** Orders at or above this subtotal (in cents) ship for free (standard shipping). */
  freeShippingThreshold: 10000,
  /** Highest quantity of a single variant per order. */
  maxQtyPerLine: 10,
  shippingMethods: [
    { id: "standard", cents: 490, minDays: 2, maxDays: 4 },
    { id: "express", cents: 990, minDays: 1, maxDays: 2 },
  ],
  countries: [
    { code: "FR", fr: "France", ar: "فرنسا" },
    { code: "BE", fr: "Belgique", ar: "بلجيكا" },
    { code: "LU", fr: "Luxembourg", ar: "لوكسمبورغ" },
    { code: "DE", fr: "Allemagne", ar: "ألمانيا" },
    { code: "ES", fr: "Espagne", ar: "إسبانيا" },
    { code: "IT", fr: "Italie", ar: "إيطاليا" },
    { code: "NL", fr: "Pays-Bas", ar: "هولندا" },
    { code: "PT", fr: "Portugal", ar: "البرتغال" },
  ],
  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "contact@phonestore.example",
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+33 1 00 00 00 00",
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "",
    address: process.env.NEXT_PUBLIC_ADDRESS ?? "Adresse de la société, 75000 Paris, France",
    legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "PhoneStore SAS",
  },
} as const;

export type ShippingMethodId = (typeof store.shippingMethods)[number]["id"];
export const countryCodes = store.countries.map((c) => c.code) as [string, ...string[]];
