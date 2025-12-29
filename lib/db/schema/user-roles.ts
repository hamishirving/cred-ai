/**
 * UserRole - Permission roles for system access.
 *
 * @description Org-defined permission roles (Admin, Compliance Officer, etc.)
 * @purpose Control what users can do in the system, separate from job roles
 * @see DATA_MODEL.md#userrole
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
 * Permission strings for MVP.
 * Format: "resource:action" or "resource:*" for all actions.
 *
 * Examples:
 * - "*" = superadmin, all permissions
 * - "profiles:*" = all profile actions
 * - "profiles:read" = read profiles only
 * - "evidence:approve" = approve evidence
 * - "own:*" = only own data (candidate default)
 */
export type Permission = string;

/**
 * UserRoles define what users can do in the system.
 *
 * These are permission roles (Admin, Compliance Officer, Recruiter),
 * NOT job roles (Nurse, HCA) which drive compliance requirements.
 *
 * Each organisation defines their own permission roles.
 */
export const userRoles = pgTable("user_roles", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation owns this role */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Display name (e.g., "Admin", "Compliance Officer") */
	name: text("name").notNull(),

	/** URL-friendly identifier */
	slug: text("slug").notNull(),

	/** Description for admins */
	description: text("description"),

	/** Permission strings for this role */
	permissions: jsonb("permissions").$type<Permission[]>().notNull().default([]),

	/** Whether this is the default role for new users in this org */
	isDefault: boolean("is_default").notNull().default(false),

	/** Whether this role is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserRole = typeof userRoles.$inferSelect;
export type NewUserRole = typeof userRoles.$inferInsert;
