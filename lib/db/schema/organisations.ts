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
