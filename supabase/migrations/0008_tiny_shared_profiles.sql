CREATE TABLE "profile_share_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"profile_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"created_by" uuid,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile_share_links" ADD CONSTRAINT "profile_share_links_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile_share_links" ADD CONSTRAINT "profile_share_links_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profile_share_links" ADD CONSTRAINT "profile_share_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "profile_share_links_token_uidx" ON "profile_share_links" USING btree ("token");
--> statement-breakpoint
CREATE INDEX "profile_share_links_expires_at_idx" ON "profile_share_links" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX "profile_share_links_profile_id_idx" ON "profile_share_links" USING btree ("profile_id");
