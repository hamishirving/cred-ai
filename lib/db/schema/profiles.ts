/**
 * Profile - The candidate/worker being onboarded.
 *
 * @description Core person record
 * @purpose Candidate-scoped evidence, overall compliance status
 * @see DATA_MODEL.md#profile
 */
import {
	boolean,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { userRoles } from "./user-roles";

/**
 * Profiles represent candidates/workers in the system.
 *
 * A profile is the core person record. Evidence and compliance
 * is tracked against profiles (candidate-scoped) or placements
 * (placement-scoped).
 */
export const profiles = pgTable("profiles", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Primary organisation for this profile */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Auth user ID (links to Supabase auth) */
	authUserId: uuid("auth_user_id"),

	/** Permission role (what they can do in the system) */
	userRoleId: uuid("user_role_id").references(() => userRoles.id),

	/** Email address */
	email: text("email").notNull(),

	/** First name */
	firstName: text("first_name").notNull(),

	/** Last name */
	lastName: text("last_name").notNull(),

	/** Phone number */
	phone: text("phone"),

	/** Date of birth */
	dateOfBirth: timestamp("date_of_birth"),

	/** Current lifecycle status */
	status: varchar("status", {
		enum: ["invited", "active", "inactive", "archived"],
	})
		.notNull()
		.default("invited"),

	/** Address */
	address: jsonb("address").$type<{
		line1?: string;
		line2?: string;
		city?: string;
		postcode?: string;
		country?: string;
	}>(),

	/** National Insurance number (UK) or equivalent */
	nationalId: text("national_id"),

	/** Professional registration number (e.g., NMC PIN) */
	professionalRegistration: text("professional_registration"),

	/** Emergency contact */
	emergencyContact: jsonb("emergency_contact").$type<{
		name?: string;
		relationship?: string;
		phone?: string;
	}>(),

	/** Flexible custom fields */
	customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

	/** Whether profile is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
