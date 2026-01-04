/**
 * OrgMembership - Links User to Organisation with a specific role.
 *
 * @description Per-org authorisation layer, optionally links to compliance Profile
 * @purpose User roles per org, optional compliance tracking per membership
 * @see DATA_MODEL.md#orgmembership
 */
import {
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { organisations } from "./organisations";
import { userRoles } from "./user-roles";
import { profiles } from "./profiles";

/**
 * Membership status values.
 */
export type MembershipStatus = "invited" | "active" | "suspended" | "archived";

/**
 * OrgMemberships link users to organisations.
 *
 * One user can have multiple memberships across different orgs
 * (passport model). Each membership has a specific role for that org.
 *
 * If compliance tracking is needed (e.g., for candidates), the
 * membership links to a Profile.
 *
 * @example
 * User joins Org A as "Admin" (no profile needed)
 * User joins Org B as "Candidate" (profile created for compliance)
 */
export const orgMemberships = pgTable("org_memberships", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** The user who has this membership */
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id),

	/** The organisation they belong to */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Their permission role in this org */
	userRoleId: uuid("user_role_id")
		.notNull()
		.references(() => userRoles.id),

	/** Optional profile for compliance tracking */
	profileId: uuid("profile_id").references(() => profiles.id),

	/** Membership lifecycle status */
	status: varchar("status", {
		enum: ["invited", "active", "suspended", "archived"],
	})
		.notNull()
		.default("invited"),

	/** When the invitation was sent */
	invitedAt: timestamp("invited_at"),

	/** When the user accepted/joined */
	joinedAt: timestamp("joined_at"),

	/** Custom fields for org-specific data */
	customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type OrgMembership = typeof orgMemberships.$inferSelect;
export type NewOrgMembership = typeof orgMemberships.$inferInsert;
