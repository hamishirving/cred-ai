CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"system_prompt" text NOT NULL,
	"tools" text[] DEFAULT '{}' NOT NULL,
	"input_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints" jsonb DEFAULT '{"maxSteps":10,"maxExecutionTime":60000}'::jsonb NOT NULL,
	"trigger" jsonb DEFAULT '{"type":"manual"}'::jsonb NOT NULL,
	"oversight" jsonb DEFAULT '{"mode":"auto"}'::jsonb NOT NULL,
	"conditions" jsonb,
	"org_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agents_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "skill_executions" RENAME TO "agent_executions";--> statement-breakpoint
ALTER TABLE "agent_executions" RENAME COLUMN "skill_id" TO "agent_id";