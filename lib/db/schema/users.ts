/**
 * User - Global identity entity.
 *
 * @description Core user identity, separate from org-specific roles/compliance
 * @purpose Single person across multiple orgs (passport model)
 * @see DATA_MODEL.md#user
 */
import {
	boolean,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

/**
 * User preferences stored in JSONB.
 */
export interface UserPreferences {
	timezone?: string;
	locale?: string;
	notifications?: {
		email: boolean;
		sms: boolean;
		push: boolean;
	};
}

/**
 * Users represent people in the system.
 *
 * A User is the global identity - one person, potentially across
 * multiple organisations. OrgMembership links users to orgs with
 * specific roles.
 *
 * @example
 * auth.users (Supabase) -> User (identity) -> OrgMembership(s) -> Profile (if compliance needed)
 */
export const users = pgTable("users", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Links to Supabase auth.users (nullable for seeded demo users) */
	authUserId: uuid("auth_user_id").unique(),

	/** Email address (required for identity) */
	email: text("email").notNull(),

	/** First name */
	firstName: text("first_name").notNull(),

	/** Last name */
	lastName: text("last_name").notNull(),

	/** Phone number */
	phone: text("phone"),

	/** User preferences (timezone, locale, notifications) */
	preferences: jsonb("preferences").$type<UserPreferences>(),

	/** Currently selected organisation context */
	currentOrgId: uuid("current_org_id").references(() => organisations.id),

	/** Whether user is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
