ALTER TABLE "orders" ADD COLUMN "deposit_method" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deposit_ref" text DEFAULT '' NOT NULL;