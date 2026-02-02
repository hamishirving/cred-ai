CREATE TABLE "skill_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" text NOT NULL,
	"org_id" uuid,
	"user_id" uuid,
	"trigger_type" varchar(10) DEFAULT 'manual' NOT NULL,
	"status" varchar(15) DEFAULT 'running' NOT NULL,
	"input" jsonb,
	"steps" jsonb DEFAULT '[]'::jsonb,
	"output" jsonb,
	"tokens_used" jsonb,
	"model" text,
	"duration_ms" integer,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
