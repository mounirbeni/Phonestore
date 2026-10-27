import { z } from "zod";
import { countryCodes, store } from "@/config/store";

export const checkoutSchema = z.object({
  locale: z.enum(["fr", "ar"]),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().pipe(z.email().max(120)),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s().-]{6,20}$/),
  address: z.string().trim().min(3).max(160),
  address2: z.string().trim().max(160).default(""),
  city: z.string().trim().min(1).max(80),
  // Optional: many customers paying on delivery do not know their postal code.
  postalCode: z.string().trim().max(12).default(""),
  country: z.enum(countryCodes),
  shippingMethod: z.enum(store.shippingMethods.map((m) => m.id) as [string, ...string[]]),
  couponCode: z.string().trim().max(40).optional(),
  note: z.string().trim().max(500).default(""),
  website: z.string().max(0).optional(), // honeypot: must stay empty
  items: z
    .array(z.object({ variantId: z.number().int().positive(), qty: z.number().int().min(1).max(store.maxQtyPerLine) }))
    .min(1)
    .max(30),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;
