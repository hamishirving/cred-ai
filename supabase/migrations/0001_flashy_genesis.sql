CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"assignee_id" uuid,
	"assignee_role" varchar(50),
	"subject_type" varchar(20),
	"subject_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"priority" varchar(10) DEFAULT 'medium' NOT NULL,
	"category" varchar(20) DEFAULT 'general',
	"source" varchar(15) NOT NULL,
	"agent_id" varchar(50),
	"insight_id" uuid,
	"ai_reasoning" text,
	"status" varchar(15) DEFAULT 'pending' NOT NULL,
	"due_at" timestamp,
	"snoozed_until" timestamp,
	"completed_at" timestamp,
	"completed_by" uuid,
	"completion_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;