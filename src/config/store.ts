export const store = {
  name: process.env.NEXT_PUBLIC_STORE_NAME ?? "ElectroSalam",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  currency: "MAD",
  /** Highest quantity of a single variant per order. */
  maxQtyPerLine: 10,
  /** Categories that first ask "new or used?" and then the brand. */
  conditionCategories: ["telephones"] as string[],
  shippingMethods: [
    { id: "standard", cents: 3000, minDays: 1, maxDays: 3 },
    { id: "express", cents: 5000, minDays: 1, maxDays: 2 },
  ],
  /** Fixed advance paid by bank transfer to confirm an order; the rest is paid in cash on delivery. */
  deposit: {
    cents: 10000,
    bank: process.env.NEXT_PUBLIC_BANK_NAME ?? "",
    holder: process.env.NEXT_PUBLIC_BANK_HOLDER ?? "",
    rib: process.env.NEXT_PUBLIC_BANK_RIB ?? "",
  },
  countries: [{ code: "MA", fr: "Maroc", ar: "المغرب" }],

  contact: {
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "electrosalam12000@gmail.com",
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+212 520 06 29 20",
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "",
    /** Shops; `city` is shown as the label, `line` is the postal address. */
    addresses: [
      { city: { fr: "Casablanca", ar: "الدار البيضاء" }, line: "All. des Mimosas, Casablanca 20590", locality: "Casablanca", postalCode: "20590" },
      {
        city: { fr: "Marrakech", ar: "مراكش" },
        line: "Résidence Aya, Boulevard Mohammed Abdelkarim El Khattabi, Marrakech 40000",
        locality: "Marrakech",
        postalCode: "40000",
      },
    ],
    legalName: process.env.NEXT_PUBLIC_LEGAL_NAME ?? "ElectroSalam",
  },
} as const;

export type ShippingMethodId = (typeof store.shippingMethods)[number]["id"];
export const countryCodes = store.countries.map((c) => c.code) as [string, ...string[]];
