/**
 * Profile - Compliance data for a person.
 *
 * @description Compliance-focused data for candidates/workers
 * @purpose Candidate-scoped evidence, compliance requirements, professional details
 * @see DATA_MODEL.md#profile
 *
 * Note: Auth and role are now managed via User + OrgMembership.
 * Profile is linked via OrgMembership.profileId when compliance tracking is needed.
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

/**
 * Profiles hold compliance data for people who need compliance tracking.
 *
 * A Profile is linked from OrgMembership when a user needs compliance
 * tracking in an organisation (e.g., candidates, nurses, contractors).
 *
 * Identity and authorisation are managed via User + OrgMembership.
 * Profile focuses purely on compliance-relevant data.
 */
export const profiles = pgTable("profiles", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Organisation this profile belongs to */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Email address (denormalised from User for compliance comms) */
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
