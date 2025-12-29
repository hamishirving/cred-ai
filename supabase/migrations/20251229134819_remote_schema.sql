


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "drizzle";


ALTER SCHEMA "drizzle" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
    "id" integer NOT NULL,
    "hash" "text" NOT NULL,
    "created_at" bigint
);


ALTER TABLE "drizzle"."__drizzle_migrations" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "drizzle"."__drizzle_migrations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "drizzle"."__drizzle_migrations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "drizzle"."__drizzle_migrations_id_seq" OWNED BY "drizzle"."__drizzle_migrations"."id";



CREATE TABLE IF NOT EXISTS "public"."activities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "profile_id" "uuid",
    "placement_ids" "jsonb",
    "activity_type" character varying NOT NULL,
    "actor" character varying NOT NULL,
    "actor_user_id" "uuid",
    "channel" character varying,
    "summary" "text" NOT NULL,
    "details" "jsonb",
    "ai_reasoning" "text",
    "ai_confidence" "text",
    "related_entity_type" character varying,
    "related_entity_id" "uuid",
    "visible_to_candidate" character varying DEFAULT 'false'::character varying NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "status" character varying DEFAULT 'applied'::character varying NOT NULL,
    "cover_letter" "text",
    "withdrawal_reason" "text",
    "rejection_reason" "text",
    "applied_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "status_changed_at" timestamp without time zone,
    "custom_fields" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."assignment_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "package_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "role_id" "uuid",
    "work_node_type_id" "uuid",
    "jurisdictions" "jsonb",
    "org_scope" character varying DEFAULT 'all'::character varying NOT NULL,
    "priority" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."assignment_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidate_experiences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "type" character varying NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "derived_from_placement_ids" "jsonb",
    "recency" timestamp without time zone,
    "duration" "text",
    "volume" integer,
    "verification_status" character varying DEFAULT 'unverified'::character varying NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."candidate_experiences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."candidate_skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "skill_id" "uuid" NOT NULL,
    "compliance_element_id" "uuid" NOT NULL,
    "status" character varying DEFAULT 'pending'::character varying NOT NULL,
    "proficiency_level" character varying,
    "context" "jsonb",
    "acquired_at" timestamp without time zone,
    "expires_at" timestamp without time zone,
    "source_organisation_id" "uuid",
    "is_portable" boolean DEFAULT false NOT NULL,
    "transferred_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."candidate_skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "title" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "visibility" character varying DEFAULT 'private'::character varying NOT NULL,
    "last_context" "jsonb"
);


ALTER TABLE "public"."chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compliance_elements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "scope" character varying DEFAULT 'candidate'::character varying NOT NULL,
    "data_ownership" character varying DEFAULT 'inherit'::character varying NOT NULL,
    "evidence_type" character varying NOT NULL,
    "expiry_days" integer,
    "renewal_required" boolean DEFAULT true NOT NULL,
    "expiry_warning_days" integer DEFAULT 30,
    "verification_rules" "jsonb",
    "only_jurisdictions" "jsonb",
    "exclude_jurisdictions" "jsonb",
    "jurisdiction_required" boolean DEFAULT false NOT NULL,
    "substitutes" "jsonb",
    "integration_key" "text",
    "grants_skill_ids" "jsonb",
    "custom_fields" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."compliance_elements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compliance_gaps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "placement_id" "uuid",
    "compliance_element_id" "uuid" NOT NULL,
    "gap_type" character varying NOT NULL,
    "waiting_on" character varying NOT NULL,
    "status" character varying DEFAULT 'open'::character varying NOT NULL,
    "priority" character varying DEFAULT 'medium'::character varying NOT NULL,
    "identified_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "due_at" timestamp without time zone,
    "last_chased_at" timestamp without time zone,
    "chase_count" "text",
    "resolved_at" timestamp without time zone,
    "resolution" "jsonb",
    "suggested_action" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."compliance_gaps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compliance_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "only_jurisdictions" "jsonb",
    "is_default" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."compliance_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp without time zone NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "kind" character varying DEFAULT 'text'::character varying NOT NULL,
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."entity_stage_positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "pipeline_id" "uuid" NOT NULL,
    "current_stage_id" "uuid" NOT NULL,
    "entered_stage_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "moved_by" "uuid",
    "due_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."entity_stage_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."escalation_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "escalation_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_recommended" boolean DEFAULT false NOT NULL,
    "action" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."escalation_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."escalations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "compliance_element_id" "uuid",
    "escalation_type" character varying NOT NULL,
    "status" character varying DEFAULT 'pending'::character varying NOT NULL,
    "priority" character varying DEFAULT 'medium'::character varying NOT NULL,
    "question" "text" NOT NULL,
    "ai_reasoning" "text",
    "ai_confidence" "text",
    "ai_recommendation" "text",
    "assigned_to" "uuid",
    "due_at" timestamp without time zone,
    "resolution" character varying,
    "resolution_notes" "text",
    "resolved_by" "uuid",
    "resolved_at" timestamp without time zone,
    "context" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."escalations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evidence" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "compliance_element_id" "uuid" NOT NULL,
    "profile_id" "uuid",
    "placement_id" "uuid",
    "evidence_type" character varying NOT NULL,
    "source" character varying NOT NULL,
    "status" character varying DEFAULT 'pending'::character varying NOT NULL,
    "verification_status" character varying DEFAULT 'unverified'::character varying NOT NULL,
    "ai_confidence" integer,
    "data_ownership" character varying DEFAULT 'organisation'::character varying NOT NULL,
    "consented_to_share" boolean DEFAULT false NOT NULL,
    "jurisdiction" "text",
    "file_path" "text",
    "file_name" "text",
    "mime_type" "text",
    "file_size" integer,
    "issued_at" timestamp without time zone,
    "expires_at" timestamp without time zone,
    "verified_at" timestamp without time zone,
    "verified_by" "uuid",
    "extracted_data" "jsonb",
    "form_responses" "jsonb",
    "check_result" "jsonb",
    "rejection_reason" "text",
    "notes" "text",
    "custom_fields" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."evidence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "work_node_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" character varying DEFAULT 'draft'::character varying NOT NULL,
    "positions_available" integer DEFAULT 1 NOT NULL,
    "positions_filled" integer DEFAULT 0 NOT NULL,
    "posted_at" timestamp without time zone,
    "closing_date" timestamp without time zone,
    "start_date" timestamp without time zone,
    "duration" "text",
    "compensation" "jsonb",
    "additional_package_ids" "jsonb",
    "custom_fields" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chat_id" "uuid" NOT NULL,
    "role" character varying NOT NULL,
    "parts" json NOT NULL,
    "attachments" json NOT NULL,
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organisations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "parent_id" "uuid",
    "settings" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organisations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."package_elements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "package_id" "uuid" NOT NULL,
    "element_id" "uuid" NOT NULL,
    "is_required" boolean DEFAULT true NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "expiry_days_override" integer,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."package_elements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "pipeline_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "stage_order" integer DEFAULT 0 NOT NULL,
    "owner_role_id" "uuid",
    "target_days" integer,
    "escalate_after_days" integer,
    "escalate_to_role_id" "uuid",
    "auto_advance_conditions" "jsonb",
    "actions" "jsonb",
    "allow_backward" boolean DEFAULT true NOT NULL,
    "is_terminal" boolean DEFAULT false NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pipeline_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipelines" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "applies_to" character varying NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."pipelines" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."placements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "work_node_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "application_id" "uuid",
    "status" character varying DEFAULT 'pending'::character varying NOT NULL,
    "compliance_percentage" integer DEFAULT 0 NOT NULL,
    "is_compliant" boolean DEFAULT false NOT NULL,
    "start_date" timestamp without time zone,
    "end_date" timestamp without time zone,
    "reference" "text",
    "notes" "text",
    "package_ids" "jsonb",
    "custom_fields" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."placements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "auth_user_id" "uuid",
    "email" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "phone" "text",
    "date_of_birth" timestamp without time zone,
    "status" character varying DEFAULT 'invited'::character varying NOT NULL,
    "address" "jsonb",
    "national_id" "text",
    "professional_registration" "text",
    "emergency_contact" "jsonb",
    "custom_fields" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "user_role_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "professional_body" "text",
    "custom_fields" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid",
    "framework_id" "uuid",
    "name" "text" NOT NULL,
    "description" "text",
    "parent_id" "uuid",
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."skill_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_frameworks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "jurisdiction" "text",
    "version" "text",
    "is_template" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."skill_frameworks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skill_requirements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "skill_id" "uuid" NOT NULL,
    "is_required" boolean DEFAULT true NOT NULL,
    "minimum_proficiency" character varying,
    "context_required" "jsonb",
    "recency_required" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."skill_requirements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."skills" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "organisation_id" "uuid",
    "code" "text",
    "name" "text" NOT NULL,
    "description" "text",
    "verification_type" character varying DEFAULT 'evidence'::character varying NOT NULL,
    "proficiency_levels" "jsonb",
    "validity_period" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."skills" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stage_transitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" character varying NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "from_stage_id" "uuid",
    "to_stage_id" "uuid" NOT NULL,
    "transition_type" character varying NOT NULL,
    "triggered_by" "uuid",
    "reason" "text",
    "transitioned_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."stage_transitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."streams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chat_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."streams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "document_created_at" timestamp without time zone NOT NULL,
    "original_text" "text" NOT NULL,
    "suggested_text" "text" NOT NULL,
    "description" "text",
    "is_resolved" boolean DEFAULT false NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone NOT NULL
);


ALTER TABLE "public"."suggestions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "permissions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(64) NOT NULL,
    "current_profile_id" "uuid"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voice_calls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "template_slug" "text" NOT NULL,
    "phone_number" "text" NOT NULL,
    "recipient_name" "text",
    "context" "jsonb" NOT NULL,
    "captured_data" "jsonb",
    "vapi_call_id" "text",
    "vapi_assistant_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "recording_url" "text",
    "transcript" "jsonb",
    "duration" integer,
    "outcome" "text",
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "scheduled_at" timestamp without time zone,
    "started_at" timestamp without time zone,
    "ended_at" timestamp without time zone
);


ALTER TABLE "public"."voice_calls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voice_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "system_prompt" "text",
    "vapi_assistant_id" "text",
    "context_schema" "jsonb",
    "capture_schema" "jsonb",
    "user_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."voice_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votes" (
    "chat_id" "uuid" NOT NULL,
    "message_id" "uuid" NOT NULL,
    "is_upvoted" boolean NOT NULL
);


ALTER TABLE "public"."votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_node_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "level" integer DEFAULT 0 NOT NULL,
    "description" "text",
    "allows_children" boolean DEFAULT true NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."work_node_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_nodes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organisation_id" "uuid" NOT NULL,
    "type_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "parent_id" "uuid",
    "jurisdiction" "text",
    "visible_to_org_ids" "jsonb",
    "address" "text",
    "custom_fields" "jsonb",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."work_nodes" OWNER TO "postgres";


ALTER TABLE ONLY "drizzle"."__drizzle_migrations" ALTER COLUMN "id" SET DEFAULT "nextval"('"drizzle"."__drizzle_migrations_id_seq"'::"regclass");



ALTER TABLE ONLY "drizzle"."__drizzle_migrations"
    ADD CONSTRAINT "__drizzle_migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."assignment_rules"
    ADD CONSTRAINT "assignment_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidate_experiences"
    ADD CONSTRAINT "candidate_experiences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."candidate_skills"
    ADD CONSTRAINT "candidate_skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_elements"
    ADD CONSTRAINT "compliance_elements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_gaps"
    ADD CONSTRAINT "compliance_gaps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_packages"
    ADD CONSTRAINT "compliance_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id", "created_at");



ALTER TABLE ONLY "public"."entity_stage_positions"
    ADD CONSTRAINT "entity_stage_positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."escalation_options"
    ADD CONSTRAINT "escalation_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organisations"
    ADD CONSTRAINT "organisations_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."package_elements"
    ADD CONSTRAINT "package_elements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipelines"
    ADD CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."placements"
    ADD CONSTRAINT "placements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_categories"
    ADD CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_frameworks"
    ADD CONSTRAINT "skill_frameworks_code_unique" UNIQUE ("code");



ALTER TABLE ONLY "public"."skill_frameworks"
    ADD CONSTRAINT "skill_frameworks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skill_requirements"
    ADD CONSTRAINT "skill_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stage_transitions"
    ADD CONSTRAINT "stage_transitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."streams"
    ADD CONSTRAINT "streams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suggestions"
    ADD CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voice_calls"
    ADD CONSTRAINT "voice_calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voice_calls"
    ADD CONSTRAINT "voice_calls_vapi_call_id_key" UNIQUE ("vapi_call_id");



ALTER TABLE ONLY "public"."voice_templates"
    ADD CONSTRAINT "voice_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voice_templates"
    ADD CONSTRAINT "voice_templates_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("chat_id", "message_id");



ALTER TABLE ONLY "public"."work_node_types"
    ADD CONSTRAINT "work_node_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_nodes"
    ADD CONSTRAINT "work_nodes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."activities"
    ADD CONSTRAINT "activities_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."assignment_rules"
    ADD CONSTRAINT "assignment_rules_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."assignment_rules"
    ADD CONSTRAINT "assignment_rules_package_id_compliance_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."compliance_packages"("id");



ALTER TABLE ONLY "public"."assignment_rules"
    ADD CONSTRAINT "assignment_rules_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."assignment_rules"
    ADD CONSTRAINT "assignment_rules_work_node_type_id_work_node_types_id_fk" FOREIGN KEY ("work_node_type_id") REFERENCES "public"."work_node_types"("id");



ALTER TABLE ONLY "public"."candidate_experiences"
    ADD CONSTRAINT "candidate_experiences_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."candidate_skills"
    ADD CONSTRAINT "candidate_skills_compliance_element_id_compliance_elements_id_f" FOREIGN KEY ("compliance_element_id") REFERENCES "public"."compliance_elements"("id");



ALTER TABLE ONLY "public"."candidate_skills"
    ADD CONSTRAINT "candidate_skills_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."candidate_skills"
    ADD CONSTRAINT "candidate_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id");



ALTER TABLE ONLY "public"."candidate_skills"
    ADD CONSTRAINT "candidate_skills_source_organisation_id_organisations_id_fk" FOREIGN KEY ("source_organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."compliance_elements"
    ADD CONSTRAINT "compliance_elements_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."compliance_gaps"
    ADD CONSTRAINT "compliance_gaps_compliance_element_id_compliance_elements_id_fk" FOREIGN KEY ("compliance_element_id") REFERENCES "public"."compliance_elements"("id");



ALTER TABLE ONLY "public"."compliance_gaps"
    ADD CONSTRAINT "compliance_gaps_placement_id_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placements"("id");



ALTER TABLE ONLY "public"."compliance_gaps"
    ADD CONSTRAINT "compliance_gaps_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."compliance_packages"
    ADD CONSTRAINT "compliance_packages_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."documents"
    ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."entity_stage_positions"
    ADD CONSTRAINT "entity_stage_positions_current_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("current_stage_id") REFERENCES "public"."pipeline_stages"("id");



ALTER TABLE ONLY "public"."entity_stage_positions"
    ADD CONSTRAINT "entity_stage_positions_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id");



ALTER TABLE ONLY "public"."escalation_options"
    ADD CONSTRAINT "escalation_options_escalation_id_escalations_id_fk" FOREIGN KEY ("escalation_id") REFERENCES "public"."escalations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_compliance_element_id_compliance_elements_id_fk" FOREIGN KEY ("compliance_element_id") REFERENCES "public"."compliance_elements"("id");



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."escalations"
    ADD CONSTRAINT "escalations_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_compliance_element_id_compliance_elements_id_fk" FOREIGN KEY ("compliance_element_id") REFERENCES "public"."compliance_elements"("id");



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_placement_id_placements_id_fk" FOREIGN KEY ("placement_id") REFERENCES "public"."placements"("id");



ALTER TABLE ONLY "public"."evidence"
    ADD CONSTRAINT "evidence_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_work_node_id_work_nodes_id_fk" FOREIGN KEY ("work_node_id") REFERENCES "public"."work_nodes"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id");



ALTER TABLE ONLY "public"."package_elements"
    ADD CONSTRAINT "package_elements_element_id_compliance_elements_id_fk" FOREIGN KEY ("element_id") REFERENCES "public"."compliance_elements"("id");



ALTER TABLE ONLY "public"."package_elements"
    ADD CONSTRAINT "package_elements_package_id_compliance_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."compliance_packages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_escalate_to_role_id_roles_id_fk" FOREIGN KEY ("escalate_to_role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_owner_role_id_roles_id_fk" FOREIGN KEY ("owner_role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipelines"
    ADD CONSTRAINT "pipelines_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."placements"
    ADD CONSTRAINT "placements_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id");



ALTER TABLE ONLY "public"."placements"
    ADD CONSTRAINT "placements_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."placements"
    ADD CONSTRAINT "placements_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."placements"
    ADD CONSTRAINT "placements_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."placements"
    ADD CONSTRAINT "placements_work_node_id_work_nodes_id_fk" FOREIGN KEY ("work_node_id") REFERENCES "public"."work_nodes"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_role_id_user_roles_id_fk" FOREIGN KEY ("user_role_id") REFERENCES "public"."user_roles"("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."skill_categories"
    ADD CONSTRAINT "skill_categories_framework_id_skill_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."skill_frameworks"("id");



ALTER TABLE ONLY "public"."skill_categories"
    ADD CONSTRAINT "skill_categories_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."skill_requirements"
    ADD CONSTRAINT "skill_requirements_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id");



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_category_id_skill_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."skill_categories"("id");



ALTER TABLE ONLY "public"."skills"
    ADD CONSTRAINT "skills_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."stage_transitions"
    ADD CONSTRAINT "stage_transitions_from_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "public"."pipeline_stages"("id");



ALTER TABLE ONLY "public"."stage_transitions"
    ADD CONSTRAINT "stage_transitions_to_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("to_stage_id") REFERENCES "public"."pipeline_stages"("id");



ALTER TABLE ONLY "public"."streams"
    ADD CONSTRAINT "streams_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id");



ALTER TABLE ONLY "public"."suggestions"
    ADD CONSTRAINT "suggestions_document_id_document_created_at_fkey" FOREIGN KEY ("document_id", "document_created_at") REFERENCES "public"."documents"("id", "created_at");



ALTER TABLE ONLY "public"."suggestions"
    ADD CONSTRAINT "suggestions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."voice_calls"
    ADD CONSTRAINT "voice_calls_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."voice_templates"("id");



ALTER TABLE ONLY "public"."voice_calls"
    ADD CONSTRAINT "voice_calls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."voice_templates"
    ADD CONSTRAINT "voice_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id");



ALTER TABLE ONLY "public"."work_node_types"
    ADD CONSTRAINT "work_node_types_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."work_nodes"
    ADD CONSTRAINT "work_nodes_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id");



ALTER TABLE ONLY "public"."work_nodes"
    ADD CONSTRAINT "work_nodes_type_id_work_node_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."work_node_types"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."activities" TO "anon";
GRANT ALL ON TABLE "public"."activities" TO "authenticated";
GRANT ALL ON TABLE "public"."activities" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."assignment_rules" TO "anon";
GRANT ALL ON TABLE "public"."assignment_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."assignment_rules" TO "service_role";



GRANT ALL ON TABLE "public"."candidate_experiences" TO "anon";
GRANT ALL ON TABLE "public"."candidate_experiences" TO "authenticated";
GRANT ALL ON TABLE "public"."candidate_experiences" TO "service_role";



GRANT ALL ON TABLE "public"."candidate_skills" TO "anon";
GRANT ALL ON TABLE "public"."candidate_skills" TO "authenticated";
GRANT ALL ON TABLE "public"."candidate_skills" TO "service_role";



GRANT ALL ON TABLE "public"."chats" TO "anon";
GRANT ALL ON TABLE "public"."chats" TO "authenticated";
GRANT ALL ON TABLE "public"."chats" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_elements" TO "anon";
GRANT ALL ON TABLE "public"."compliance_elements" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_elements" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_gaps" TO "anon";
GRANT ALL ON TABLE "public"."compliance_gaps" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_gaps" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_packages" TO "anon";
GRANT ALL ON TABLE "public"."compliance_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_packages" TO "service_role";



GRANT ALL ON TABLE "public"."documents" TO "anon";
GRANT ALL ON TABLE "public"."documents" TO "authenticated";
GRANT ALL ON TABLE "public"."documents" TO "service_role";



GRANT ALL ON TABLE "public"."entity_stage_positions" TO "anon";
GRANT ALL ON TABLE "public"."entity_stage_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."entity_stage_positions" TO "service_role";



GRANT ALL ON TABLE "public"."escalation_options" TO "anon";
GRANT ALL ON TABLE "public"."escalation_options" TO "authenticated";
GRANT ALL ON TABLE "public"."escalation_options" TO "service_role";



GRANT ALL ON TABLE "public"."escalations" TO "anon";
GRANT ALL ON TABLE "public"."escalations" TO "authenticated";
GRANT ALL ON TABLE "public"."escalations" TO "service_role";



GRANT ALL ON TABLE "public"."evidence" TO "anon";
GRANT ALL ON TABLE "public"."evidence" TO "authenticated";
GRANT ALL ON TABLE "public"."evidence" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."organisations" TO "anon";
GRANT ALL ON TABLE "public"."organisations" TO "authenticated";
GRANT ALL ON TABLE "public"."organisations" TO "service_role";



GRANT ALL ON TABLE "public"."package_elements" TO "anon";
GRANT ALL ON TABLE "public"."package_elements" TO "authenticated";
GRANT ALL ON TABLE "public"."package_elements" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_stages" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "service_role";



GRANT ALL ON TABLE "public"."pipelines" TO "anon";
GRANT ALL ON TABLE "public"."pipelines" TO "authenticated";
GRANT ALL ON TABLE "public"."pipelines" TO "service_role";



GRANT ALL ON TABLE "public"."placements" TO "anon";
GRANT ALL ON TABLE "public"."placements" TO "authenticated";
GRANT ALL ON TABLE "public"."placements" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."skill_categories" TO "anon";
GRANT ALL ON TABLE "public"."skill_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_categories" TO "service_role";



GRANT ALL ON TABLE "public"."skill_frameworks" TO "anon";
GRANT ALL ON TABLE "public"."skill_frameworks" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_frameworks" TO "service_role";



GRANT ALL ON TABLE "public"."skill_requirements" TO "anon";
GRANT ALL ON TABLE "public"."skill_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."skill_requirements" TO "service_role";



GRANT ALL ON TABLE "public"."skills" TO "anon";
GRANT ALL ON TABLE "public"."skills" TO "authenticated";
GRANT ALL ON TABLE "public"."skills" TO "service_role";



GRANT ALL ON TABLE "public"."stage_transitions" TO "anon";
GRANT ALL ON TABLE "public"."stage_transitions" TO "authenticated";
GRANT ALL ON TABLE "public"."stage_transitions" TO "service_role";



GRANT ALL ON TABLE "public"."streams" TO "anon";
GRANT ALL ON TABLE "public"."streams" TO "authenticated";
GRANT ALL ON TABLE "public"."streams" TO "service_role";



GRANT ALL ON TABLE "public"."suggestions" TO "anon";
GRANT ALL ON TABLE "public"."suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."voice_calls" TO "anon";
GRANT ALL ON TABLE "public"."voice_calls" TO "authenticated";
GRANT ALL ON TABLE "public"."voice_calls" TO "service_role";



GRANT ALL ON TABLE "public"."voice_templates" TO "anon";
GRANT ALL ON TABLE "public"."voice_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."voice_templates" TO "service_role";



GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";



GRANT ALL ON TABLE "public"."work_node_types" TO "anon";
GRANT ALL ON TABLE "public"."work_node_types" TO "authenticated";
GRANT ALL ON TABLE "public"."work_node_types" TO "service_role";



GRANT ALL ON TABLE "public"."work_nodes" TO "anon";
GRANT ALL ON TABLE "public"."work_nodes" TO "authenticated";
GRANT ALL ON TABLE "public"."work_nodes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































