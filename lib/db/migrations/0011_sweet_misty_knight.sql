CREATE TABLE IF NOT EXISTS "VoiceCall" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"templateId" uuid,
	"templateSlug" text NOT NULL,
	"phoneNumber" text NOT NULL,
	"recipientName" text,
	"context" jsonb NOT NULL,
	"capturedData" jsonb,
	"vapiCallId" text,
	"vapiAssistantId" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"recordingUrl" text,
	"transcript" jsonb,
	"duration" integer,
	"outcome" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"scheduledAt" timestamp,
	"startedAt" timestamp,
	"endedAt" timestamp,
	CONSTRAINT "VoiceCall_vapiCallId_unique" UNIQUE("vapiCallId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "VoiceTemplate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"systemPrompt" text,
	"vapiAssistantId" text,
	"contextSchema" jsonb,
	"captureSchema" jsonb,
	"userId" uuid,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "VoiceTemplate_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_templateId_VoiceTemplate_id_fk" FOREIGN KEY ("templateId") REFERENCES "public"."VoiceTemplate"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "VoiceTemplate" ADD CONSTRAINT "VoiceTemplate_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
