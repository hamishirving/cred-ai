/**
 * Role - Job role/type within organisation.
 *
 * @description Role-based compliance requirements
 * @purpose Different requirements per role (Nurse vs HCA vs Doctor)
 * @see DATA_MODEL.md#role
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
 * Roles define the job types within an organisation.
 *
 * Compliance packages can be assigned based on role,
 * so different roles have different requirements.
 *
 * Examples: Nurse, HCA, Doctor, Admin, Cleaner
 */
export const roles = pgTable("roles", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation this role belongs to */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Display name (e.g., "Registered Nurse", "Healthcare Assistant") */
	name: text("name").notNull(),

	/** URL-friendly identifier */
	slug: text("slug").notNull(),

	/** Description for admins */
	description: text("description"),

	/** Professional body this role requires (e.g., "nmc", "gmc", "hcpc") */
	professionalBody: text("professional_body"),

	/** Flexible custom fields */
	customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

	/** Whether this role is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
