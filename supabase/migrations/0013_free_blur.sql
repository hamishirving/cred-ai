CREATE TABLE "acceptable_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compliance_element_id" uuid NOT NULL,
	"name" text NOT NULL,
	"document_type" varchar NOT NULL,
	"acceptance_criteria" text,
	"clinician_guidance" text,
	"status" varchar DEFAULT 'preferred' NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acceptable_documents" ADD CONSTRAINT "acceptable_documents_compliance_element_id_compliance_elements_id_fk" FOREIGN KEY ("compliance_element_id") REFERENCES "public"."compliance_elements"("id") ON DELETE no action ON UPDATE no action;