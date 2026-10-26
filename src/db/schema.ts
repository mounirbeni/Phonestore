import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export type Spec = { fr: string; ar: string; value: string };

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameFr: text("name_fr").notNull(),
  nameAr: text("name_ar").notNull(),
  icon: text("icon").notNull().default("phone"),
  sort: integer("sort").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    brand: text("brand").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    shortFr: text("short_fr").notNull().default(""),
    shortAr: text("short_ar").notNull().default(""),
    descFr: text("desc_fr").notNull().default(""),
    descAr: text("desc_ar").notNull().default(""),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    specs: jsonb("specs").$type<Spec[]>().notNull().default([]),
    featured: boolean("featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    active: boolean("active").notNull().default(true),
    warrantyMonths: integer("warranty_months").notNull().default(24),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("products_category_idx").on(t.categoryId), index("products_active_idx").on(t.active)],
);

export const variants = pgTable(
  "variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    colorFr: text("color_fr").notNull().default(""),
    colorAr: text("color_ar").notNull().default(""),
    colorHex: text("color_hex").notNull().default("#1f2937"),
    storage: text("storage").notNull().default(""),
    price: integer("price").notNull(), // cents (EUR)
    compareAtPrice: integer("compare_at_price"), // cents, strike-through price
    stock: integer("stock").notNull().default(0),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("variants_product_idx").on(t.productId)],
);

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  percent: integer("percent"), // 1..100
  amountOff: integer("amount_off"), // cents
  minSubtotal: integer("min_subtotal").notNull().default(0),
  active: boolean("active").notNull().default(true),
  usedCount: integer("used_count").notNull().default(0),
  maxUses: integer("max_uses"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ORDER_STATUSES = ["pending", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    number: text("number").notNull().default(""),
    token: text("token").notNull(),
    status: text("status").$type<OrderStatus>().notNull().default("pending"),
    locale: text("locale").notNull().default("fr"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    address2: text("address2").notNull().default(""),
    city: text("city").notNull(),
    postalCode: text("postal_code").notNull(),
    country: text("country").notNull(),
    shippingMethod: text("shipping_method").notNull(),
    paymentMethod: text("payment_method").notNull().default("cod"),
    couponCode: text("coupon_code"),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    shippingCost: integer("shipping_cost").notNull().default(0),
    total: integer("total").notNull(),
    customerNote: text("customer_note").notNull().default(""),
    adminNote: text("admin_note").notNull().default(""),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("orders_number_idx").on(t.number), index("orders_status_idx").on(t.status)],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: integer("variant_id").references(() => variants.id, { onDelete: "set null" }),
    productSlug: text("product_slug").notNull(),
    name: text("name").notNull(),
    variantLabel: text("variant_label").notNull().default(""),
    colorHex: text("color_hex").notNull().default("#1f2937"),
    image: text("image"),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const categoriesRelations = relations(categories, ({ many }) => ({ products: many(products) }));
export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(variants),
}));
export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, { fields: [variants.productId], references: [products.id] }),
}));
export const ordersRelations = relations(orders, ({ many }) => ({ items: many(orderItems) }));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Variant = typeof variants.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
