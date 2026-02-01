CREATE TABLE "reference_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"referee_name" text NOT NULL,
	"referee_email" text,
	"referee_phone" text NOT NULL,
	"referee_job_title" text,
	"referee_organisation" text NOT NULL,
	"relationship" varchar DEFAULT 'line_manager' NOT NULL,
	"candidate_job_title" text,
	"candidate_start_date" text,
	"candidate_end_date" text,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"captured_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"memory" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_run_at" timestamp DEFAULT now() NOT NULL,
	"run_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reference_contacts" ADD CONSTRAINT "reference_contacts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_contacts" ADD CONSTRAINT "reference_contacts_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_memory_composite_idx" ON "agent_memory" USING btree ("agent_id","subject_id","org_id");