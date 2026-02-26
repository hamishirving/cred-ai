CREATE TABLE "fa_screenings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"placement_id" uuid,
	"fa_screening_id" text NOT NULL,
	"fa_candidate_id" text NOT NULL,
	"fa_package_id" text NOT NULL,
	"status" varchar DEFAULT 'Pending' NOT NULL,
	"result" varchar DEFAULT 'Pending' NOT NULL,
	"report_items" jsonb DEFAULT '[]'::jsonb,
	"portal_url" text,
	"submitted_at" timestamp,
	"estimated_completion_at" timestamp,
	"raw_response" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fa_screenings_fa_screening_id_unique" UNIQUE("fa_screening_id")
);
--> statement-breakpoint
ALTER TABLE "fa_screenings" ADD CONSTRAINT "fa_screenings_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fa_screenings" ADD CONSTRAINT "fa_screenings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fa_screenings" ADD CONSTRAINT "fa_screenings_placement_id_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placements"("id") ON DELETE no action ON UPDATE no action;