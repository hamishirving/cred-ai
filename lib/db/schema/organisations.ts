/**
 * Organisation - Top-level tenant entity.
 *
 * @description Multi-tenant isolation with hierarchy support
 * @purpose Parent-child orgs, inherited settings, custom terminology per org
 * @see DATA_MODEL.md#organisation
 */
import {
	boolean,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

/**
 * Contact details for compliance team.
 */
export interface ComplianceContact {
	name: string;
	email: string;
	phone?: string;
}

/**
 * AI Companion settings for automated candidate communications.
 */
export interface AICompanionSettings {
	/** Whether AI companion is enabled for this org */
	enabled: boolean;

	/** Custom org voice/tone for AI-generated content */
	orgPrompt?: string;

	/** How often to send candidate emails */
	emailFrequency: "daily" | "every_2_days" | "weekly";

	/** Time to send emails (24h format, e.g., "09:00") */
	sendTime: string;

	/** Timezone for scheduling (e.g., "Europe/London") */
	timezone: string;
}

/**
 * Organisation settings for configuring org behaviour.
 */
export interface OrgSettings {
	defaultDataOwnership: "candidate" | "organisation";
	terminology?: Record<string, string>;
	features?: Record<string, boolean>;
	branding?: {
		primaryColour?: string;
		logoUrl?: string;
	};

	/** Primary compliance contact for candidate communications */
	complianceContact?: ComplianceContact;

	/** Support contact for escalations */
	supportContact?: {
		email: string;
		phone?: string;
	};

	/** AI Companion configuration */
	aiCompanion?: AICompanionSettings;
}

/**
 * Organisations table - the top-level tenant entity.
 *
 * Supports hierarchy via parentId for parent-child org relationships.
 * Settings and terminology can be inherited from parent orgs.
 */
export const organisations = pgTable("organisations", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Display name for the organisation */
	name: text("name").notNull(),

	/** URL-friendly identifier */
	slug: text("slug").notNull().unique(),

	/** Parent org for hierarchy (null = root org) */
	parentId: uuid("parent_id"),

	/** Organisation settings (terminology, features, branding) */
	settings: jsonb("settings").$type<OrgSettings>(),

	/** Whether this org is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Organisation = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;
