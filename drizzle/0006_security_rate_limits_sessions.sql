CREATE TABLE "rate_hits" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "staff" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "rate_hits_key_at_idx" ON "rate_hits" USING btree ("key","at");