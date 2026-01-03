CREATE TABLE "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp NOT NULL,
	"title" text NOT NULL,
	"user_id" uuid NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL,
	"last_context" jsonb
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"kind" varchar DEFAULT 'text' NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "documents_id_created_at_pk" PRIMARY KEY("id","created_at")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" varchar NOT NULL,
	"parts" json NOT NULL,
	"attachments" json NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streams" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "streams_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "suggestions" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"document_created_at" timestamp NOT NULL,
	"original_text" text NOT NULL,
	"suggested_text" text NOT NULL,
	"description" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "suggestions_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	"current_profile_id" uuid
);
--> statement-breakpoint
CREATE TABLE "voice_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"template_id" uuid,
	"template_slug" text NOT NULL,
	"phone_number" text NOT NULL,
	"recipient_name" text,
	"context" jsonb NOT NULL,
	"captured_data" jsonb,
	"vapi_call_id" text,
	"vapi_assistant_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"recording_url" text,
	"transcript" jsonb,
	"duration" integer,
	"outcome" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"ended_at" timestamp,
	CONSTRAINT "voice_calls_vapi_call_id_unique" UNIQUE("vapi_call_id")
);
--> statement-breakpoint
CREATE TABLE "voice_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"system_prompt" text,
	"vapi_assistant_id" text,
	"context_schema" jsonb,
	"capture_schema" jsonb,
	"user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "voice_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"chat_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"is_upvoted" boolean NOT NULL,
	CONSTRAINT "votes_chat_id_message_id_pk" PRIMARY KEY("chat_id","message_id")
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_id" uuid,
	"settings" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organisations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "work_node_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"description" text,
	"allows_children" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"jurisdiction" text,
	"visible_to_org_ids" jsonb,
	"address" text,
	"custom_fields" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"professional_body" text,
	"custom_fields" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_elements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"category" text,
	"scope" varchar DEFAULT 'candidate' NOT NULL,
	"data_ownership" varchar DEFAULT 'inherit' NOT NULL,
	"evidence_type" varchar NOT NULL,
	"expiry_days" integer,
	"renewal_required" boolean DEFAULT true NOT NULL,
	"expiry_warning_days" integer DEFAULT 30,
	"verification_rules" jsonb,
	"only_jurisdictions" jsonb,
	"exclude_jurisdictions" jsonb,
	"jurisdiction_required" boolean DEFAULT false NOT NULL,
	"substitutes" jsonb,
	"integration_key" text,
	"grants_skill_ids" jsonb,
	"custom_fields" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"category" text,
	"only_jurisdictions" jsonb,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_elements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"element_id" uuid NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"expiry_days_override" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"package_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"role_id" uuid,
	"work_node_type_id" uuid,
	"jurisdictions" jsonb,
	"org_scope" varchar DEFAULT 'all' NOT NULL,
	"priority" uuid DEFAULT gen_random_uuid() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_frameworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"jurisdiction" text,
	"version" text,
	"is_template" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skill_frameworks_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "skill_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid,
	"framework_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"parent_id" uuid,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"organisation_id" uuid,
	"code" text,
	"name" text NOT NULL,
	"description" text,
	"verification_type" varchar DEFAULT 'evidence' NOT NULL,
	"proficiency_levels" jsonb,
	"validity_period" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"compliance_element_id" uuid NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"proficiency_level" varchar,
	"context" jsonb,
	"acquired_at" timestamp,
	"expires_at" timestamp,
	"source_organisation_id" uuid,
	"is_portable" boolean DEFAULT false NOT NULL,
	"transferred_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"type" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"derived_from_placement_ids" jsonb,
	"recency" timestamp,
	"duration" text,
	"volume" integer,
	"verification_status" varchar DEFAULT 'unverified' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar NOT NULL,
	"entity_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"minimum_proficiency" varchar,
	"context_required" jsonb,
	"recency_required" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"auth_user_id" uuid,
	"user_role_id" uuid,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"date_of_birth" timestamp,
	"status" varchar DEFAULT 'invited' NOT NULL,
	"address" jsonb,
	"national_id" text,
	"professional_registration" text,
	"emergency_contact" jsonb,
	"custom_fields" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"work_node_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"positions_available" integer DEFAULT 1 NOT NULL,
	"positions_filled" integer DEFAULT 0 NOT NULL,
	"posted_at" timestamp,
	"closing_date" timestamp,
	"start_date" timestamp,
	"duration" text,
	"compensation" jsonb,
	"additional_package_ids" jsonb,
	"custom_fields" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"status" varchar DEFAULT 'applied' NOT NULL,
	"cover_letter" text,
	"withdrawal_reason" text,
	"rejection_reason" text,
	"applied_at" timestamp DEFAULT now() NOT NULL,
	"status_changed_at" timestamp,
	"custom_fields" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"work_node_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"application_id" uuid,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"compliance_percentage" integer DEFAULT 0 NOT NULL,
	"is_compliant" boolean DEFAULT false NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"reference" text,
	"notes" text,
	"package_ids" jsonb,
	"custom_fields" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"compliance_element_id" uuid NOT NULL,
	"profile_id" uuid,
	"placement_id" uuid,
	"evidence_type" varchar NOT NULL,
	"source" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"verification_status" varchar DEFAULT 'unverified' NOT NULL,
	"ai_confidence" integer,
	"data_ownership" varchar DEFAULT 'organisation' NOT NULL,
	"consented_to_share" boolean DEFAULT false NOT NULL,
	"jurisdiction" text,
	"file_path" text,
	"file_name" text,
	"mime_type" text,
	"file_size" integer,
	"issued_at" timestamp,
	"expires_at" timestamp,
	"verified_at" timestamp,
	"verified_by" uuid,
	"extracted_data" jsonb,
	"form_responses" jsonb,
	"check_result" jsonb,
	"rejection_reason" text,
	"notes" text,
	"custom_fields" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compliance_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"placement_id" uuid,
	"compliance_element_id" uuid NOT NULL,
	"gap_type" varchar NOT NULL,
	"waiting_on" varchar NOT NULL,
	"status" varchar DEFAULT 'open' NOT NULL,
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"identified_at" timestamp DEFAULT now() NOT NULL,
	"due_at" timestamp,
	"last_chased_at" timestamp,
	"chase_count" text,
	"resolved_at" timestamp,
	"resolution" jsonb,
	"suggested_action" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"applies_to" varchar NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"stage_order" integer DEFAULT 0 NOT NULL,
	"owner_role_id" uuid,
	"target_days" integer,
	"escalate_after_days" integer,
	"escalate_to_role_id" uuid,
	"auto_advance_conditions" jsonb,
	"actions" jsonb,
	"allow_backward" boolean DEFAULT true NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_stage_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar NOT NULL,
	"entity_id" uuid NOT NULL,
	"pipeline_id" uuid NOT NULL,
	"current_stage_id" uuid NOT NULL,
	"entered_stage_at" timestamp DEFAULT now() NOT NULL,
	"moved_by" uuid,
	"due_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_transitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar NOT NULL,
	"entity_id" uuid NOT NULL,
	"from_stage_id" uuid,
	"to_stage_id" uuid NOT NULL,
	"transition_type" varchar NOT NULL,
	"triggered_by" uuid,
	"reason" text,
	"transitioned_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"profile_id" uuid,
	"placement_ids" jsonb,
	"activity_type" varchar NOT NULL,
	"actor" varchar NOT NULL,
	"actor_user_id" uuid,
	"channel" varchar,
	"summary" text NOT NULL,
	"details" jsonb,
	"ai_reasoning" text,
	"ai_confidence" text,
	"related_entity_type" varchar,
	"related_entity_id" uuid,
	"visible_to_candidate" varchar DEFAULT 'false' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escalations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"compliance_element_id" uuid,
	"escalation_type" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"question" text NOT NULL,
	"ai_reasoning" text,
	"ai_confidence" text,
	"ai_recommendation" text,
	"assigned_to" uuid,
	"due_at" timestamp,
	"resolution" varchar,
	"resolution_notes" text,
	"resolved_by" uuid,
	"resolved_at" timestamp,
	"context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escalation_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escalation_id" uuid NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_recommended" boolean DEFAULT false NOT NULL,
	"action" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_document_id_document_created_at_documents_id_created_at_fk" FOREIGN KEY ("document_id","document_created_at") REFERENCES "public"."documents"("id","created_at") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_calls" ADD CONSTRAINT "voice_calls_template_id_voice_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."voice_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_templates" ADD CONSTRAINT "voice_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_node_types" ADD CONSTRAINT "work_node_types_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_nodes" ADD CONSTRAINT "work_nodes_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_nodes" ADD CONSTRAINT "work_nodes_type_id_work_node_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."work_node_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_elements" ADD CONSTRAINT "compliance_elements_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_packages" ADD CONSTRAINT "compliance_packages_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_elements" ADD CONSTRAINT "package_elements_package_id_compliance_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."compliance_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_elements" ADD CONSTRAINT "package_elements_element_id_compliance_elements_id_fk" FOREIGN KEY ("element_id") REFERENCES "public"."compliance_elements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_package_id_compliance_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."compliance_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_work_node_type_id_work_node_types_id_fk" FOREIGN KEY ("work_node_type_id") REFERENCES "public"."work_node_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_categories" ADD CONSTRAINT "skill_categories_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_categories" ADD CONSTRAINT "skill_categories_framework_id_skill_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."skill_frameworks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_category_id_skill_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."skill_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_compliance_element_id_compliance_elements_id_fk" FOREIGN KEY ("compliance_element_id") REFERENCES "public"."compliance_elements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_skills" ADD CONSTRAINT "candidate_skills_source_organisation_id_organisations_id_fk" FOREIGN KEY ("source_organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_experiences" ADD CONSTRAINT "candidate_experiences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_requirements" ADD CONSTRAINT "skill_requirements_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_role_id_user_roles_id_fk" FOREIGN KEY ("user_role_id") REFERENCES "public"."user_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_work_node_id_work_nodes_id_fk" FOREIGN KEY ("work_node_id") REFERENCES "public"."work_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_work_node_id_work_nodes_id_fk" FOREIGN KEY ("work_node_id") REFERENCES "public"."work_nodes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "placements" ADD CONSTRAINT "placements_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_compliance_element_id_compliance_elements_id_fk" FOREIGN KEY ("compliance_element_id") REFERENCES "public"."compliance_elements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_placement_id_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_gaps" ADD CONSTRAINT "compliance_gaps_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_gaps" ADD CONSTRAINT "compliance_gaps_placement_id_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_gaps" ADD CONSTRAINT "compliance_gaps_compliance_element_id_compliance_elements_id_fk" FOREIGN KEY ("compliance_element_id") REFERENCES "public"."compliance_elements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_owner_role_id_roles_id_fk" FOREIGN KEY ("owner_role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_escalate_to_role_id_roles_id_fk" FOREIGN KEY ("escalate_to_role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_stage_positions" ADD CONSTRAINT "entity_stage_positions_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_stage_positions" ADD CONSTRAINT "entity_stage_positions_current_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("current_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_from_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_to_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("to_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalations" ADD CONSTRAINT "escalations_compliance_element_id_compliance_elements_id_fk" FOREIGN KEY ("compliance_element_id") REFERENCES "public"."compliance_elements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalation_options" ADD CONSTRAINT "escalation_options_escalation_id_escalations_id_fk" FOREIGN KEY ("escalation_id") REFERENCES "public"."escalations"("id") ON DELETE cascade ON UPDATE no action;