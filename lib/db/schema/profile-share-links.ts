/**
 * Profile Share Links - Time-limited public links for profile sharing.
 *
 * @description Secure, token-based links to view profile snapshots externally
 * @purpose Allow admins to share candidate compliance profile with external parties
 */
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { profiles } from "./profiles";
import { users } from "./users";

export const profileShareLinks = pgTable(
	"profile_share_links",
	{
		id: uuid("id").primaryKey().notNull().defaultRandom(),

		/** Opaque public token used in /share/:token URL */
		token: text("token").notNull(),

		/** Profile being shared */
		profileId: uuid("profile_id")
			.notNull()
			.references(() => profiles.id),

		/** Organisation context for tenancy checks */
		organisationId: uuid("organisation_id")
			.notNull()
			.references(() => organisations.id),

		/** User who created this link */
		createdBy: uuid("created_by").references(() => users.id),

		/** Link expiry timestamp */
		expiresAt: timestamp("expires_at").notNull(),

		/** Optional soft revoke timestamp */
		revokedAt: timestamp("revoked_at"),

		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		tokenUniqueIdx: uniqueIndex("profile_share_links_token_uidx").on(table.token),
		expiresAtIdx: index("profile_share_links_expires_at_idx").on(table.expiresAt),
		profileIdIdx: index("profile_share_links_profile_id_idx").on(table.profileId),
	}),
);

export type ProfileShareLink = typeof profileShareLinks.$inferSelect;
export type NewProfileShareLink = typeof profileShareLinks.$inferInsert;
