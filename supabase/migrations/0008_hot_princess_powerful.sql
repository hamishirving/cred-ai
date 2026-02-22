ALTER TABLE "tasks" ADD COLUMN "execution_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "compliance_element_slugs" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "scheduled_for" timestamp;
