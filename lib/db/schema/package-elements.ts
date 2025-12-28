/**
 * PackageElement - Link between package and element.
 *
 * @description Package composition with overrides
 * @purpose Required vs optional elements, per-package configuration
 * @see DATA_MODEL.md#packageelement
 */
import {
	boolean,
	integer,
	pgTable,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { complianceElements } from "./compliance-elements";
import { compliancePackages } from "./compliance-packages";

/**
 * PackageElements link ComplianceElements to CompliancePackages.
 *
 * This allows per-package configuration of elements, such as
 * marking elements as required vs optional within a package.
 */
export const packageElements = pgTable("package_elements", {
	id: uuid("id").primaryKey().notNull().defaultRandom(),

	/** The package this element belongs to */
	packageId: uuid("package_id")
		.notNull()
		.references(() => compliancePackages.id, { onDelete: "cascade" }),

	/** The element included in this package */
	elementId: uuid("element_id")
		.notNull()
		.references(() => complianceElements.id),

	/** Whether this element is required in this package */
	isRequired: boolean("is_required").notNull().default(true),

	/** Display order within the package */
	displayOrder: integer("display_order").notNull().default(0),

	/** Override expiry days for this package (null = use element default) */
	expiryDaysOverride: integer("expiry_days_override"),

	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PackageElement = typeof packageElements.$inferSelect;
export type NewPackageElement = typeof packageElements.$inferInsert;
