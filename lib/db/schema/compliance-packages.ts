/**
 * CompliancePackage - Bundle of compliance elements.
 *
 * @description Group requirements together
 * @purpose Reusable requirement sets, assignment rules
 * @see DATA_MODEL.md#compliancepackage
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
 * CompliancePackages bundle multiple elements together.
 *
 * Examples: "NHS Trust Starter Pack", "International Nurse Package"
 *
 * Packages can be assigned to placements via assignment rules,
 * or manually by admins.
 */
export const compliancePackages = pgTable("compliance_packages", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** Which organisation owns this package */
	organisationId: uuid("organisation_id")
		.notNull()
		.references(() => organisations.id),

	/** Display name */
	name: text("name").notNull(),

	/** URL-friendly identifier */
	slug: text("slug").notNull(),

	/** Description for admins */
	description: text("description"),

	/** Category for grouping */
	category: text("category"),

	/** Jurisdictions this package only applies to */
	onlyJurisdictions: jsonb("only_jurisdictions").$type<string[]>(),

	/** Whether this is a system default package */
	isDefault: boolean("is_default").notNull().default(false),

	/** Whether this package is active */
	isActive: boolean("is_active").notNull().default(true),

	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CompliancePackage = typeof compliancePackages.$inferSelect;
export type NewCompliancePackage = typeof compliancePackages.$inferInsert;
