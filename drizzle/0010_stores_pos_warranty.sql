CREATE TABLE "stores" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name_fr" text NOT NULL,
	"name_ar" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"is_main" boolean DEFAULT false NOT NULL,
	"pickup" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "stores_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "variant_stock" (
	"variant_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"qty" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "variant_stock_variant_id_store_id_pk" PRIMARY KEY("variant_id","store_id")
);
--> statement-breakpoint
CREATE TABLE "warranties" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"order_id" integer NOT NULL,
	"order_item_id" integer,
	"product_name" text NOT NULL,
	"variant_label" text DEFAULT '' NOT NULL,
	"serial" text DEFAULT '' NOT NULL,
	"months" integer NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"customer_name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"store_id" integer,
	"voided" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "warranties_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "stock_from" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "channel" text DEFAULT 'online' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfilment" text DEFAULT 'delivery' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "store_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "seller_id" integer;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "store_id" integer;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "barcode" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "variant_stock" ADD CONSTRAINT "variant_stock_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_stock" ADD CONSTRAINT "variant_stock_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "warranties_serial_idx" ON "warranties" USING btree ("serial");--> statement-breakpoint
CREATE INDEX "warranties_phone_idx" ON "warranties" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "warranties_order_idx" ON "warranties" USING btree ("order_id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_staff_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "orders_channel_idx" ON "orders" USING btree ("channel");--> statement-breakpoint
INSERT INTO "stores" ("code", "name_fr", "name_ar", "address", "phone", "is_main", "pickup", "sort") VALUES ('casablanca', 'Casablanca', 'الدار البيضاء', 'All. des Mimosas, Casablanca 20590', '+212 520 06 29 20', true, true, 0), ('marrakech', 'Marrakech', 'مراكش', 'Résidence Aya, Boulevard Mohammed Abdelkarim El Khattabi, Marrakech 40000', '+212 520 06 29 20', false, true, 1) ON CONFLICT ("code") DO NOTHING;--> statement-breakpoint
INSERT INTO "variant_stock" ("variant_id", "store_id", "qty") SELECT v."id", s."id", v."stock" FROM "variants" v CROSS JOIN "stores" s WHERE s."code" = 'casablanca' ON CONFLICT DO NOTHING;
