CREATE TABLE "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"locale" text DEFAULT 'fr' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "warranty_months" SET DEFAULT 12;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deposit" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "deposit_paid_at" timestamp;