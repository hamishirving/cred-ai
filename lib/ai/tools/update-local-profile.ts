import { tool } from "ai";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import { orgMemberships, profiles, users } from "@/lib/db/schema";

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

const addressSchema = z.object({
	line1: z.string().optional(),
	line2: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	postcode: z.string().optional(),
	country: z.string().optional(),
});

export const updateLocalProfile = tool({
	description: `Update candidate profile fields in the local database.
Use this when a candidate provides new factual details via email (e.g. phone, address, date of birth, name update, registration number).
Requires profileId and organisationId. Only update fields explicitly provided by the candidate.`,

	inputSchema: z.object({
		profileId: z.string().uuid().describe("Candidate profile ID"),
		organisationId: z.string().uuid().describe("Organisation ID"),
		firstName: z.string().optional().describe("Updated first name"),
		lastName: z.string().optional().describe("Updated last name"),
		email: z.string().email().optional().describe("Updated email"),
		phone: z.string().optional().describe("Updated phone number"),
		dateOfBirth: z
			.string()
			.optional()
			.describe("Updated date of birth in YYYY-MM-DD format"),
		sex: z.enum(["male", "female"]).optional().describe("Updated biological sex"),
		nationalId: z
			.string()
			.optional()
			.describe("Updated national ID (e.g. SSN/NI number)"),
		professionalRegistration: z
			.string()
			.optional()
			.describe("Updated professional registration number"),
		address: addressSchema.optional().describe("Updated address fields"),
		customFields: z
			.record(z.unknown())
			.optional()
			.describe("Custom fields to update on the profile"),
		mergeCustomFields: z
			.boolean()
			.optional()
			.default(true)
			.describe("Merge with existing custom fields (default true)"),
	}),

	execute: async ({
		profileId,
		organisationId,
		firstName,
		lastName,
		email,
		phone,
		dateOfBirth,
		sex,
		nationalId,
		professionalRegistration,
		address,
		customFields,
		mergeCustomFields,
	}) => {
		console.log("[updateLocalProfile] Updating profile:", {
			profileId,
			organisationId,
		});

		try {
			const [existingProfile] = await db
				.select({
					id: profiles.id,
					customFields: profiles.customFields,
				})
				.from(profiles)
				.where(
					and(
						eq(profiles.id, profileId),
						eq(profiles.organisationId, organisationId),
					),
				)
				.limit(1);

			if (!existingProfile) {
				return {
					error: `Profile ${profileId} not found in organisation ${organisationId}.`,
				};
			}

			const [membership] = await db
				.select({ userId: orgMemberships.userId })
				.from(orgMemberships)
				.where(
					and(
						eq(orgMemberships.profileId, profileId),
						eq(orgMemberships.organisationId, organisationId),
					),
				)
				.limit(1);

			let parsedDob: Date | undefined;
			if (dateOfBirth) {
				const dob = new Date(dateOfBirth);
				if (Number.isNaN(dob.getTime())) {
					return {
						error: `Invalid dateOfBirth "${dateOfBirth}". Expected YYYY-MM-DD format.`,
					};
				}
				parsedDob = dob;
			}

			const nextCustomFields = customFields
				? mergeCustomFields
					? {
							...(existingProfile.customFields || {}),
							...customFields,
						}
					: customFields
				: undefined;

			const profileUpdate: Partial<typeof profiles.$inferInsert> = {};
			if (firstName !== undefined) profileUpdate.firstName = firstName;
			if (lastName !== undefined) profileUpdate.lastName = lastName;
			if (email !== undefined) profileUpdate.email = email;
			if (phone !== undefined) profileUpdate.phone = phone;
			if (parsedDob !== undefined) profileUpdate.dateOfBirth = parsedDob;
			if (sex !== undefined) profileUpdate.sex = sex;
			if (nationalId !== undefined) profileUpdate.nationalId = nationalId;
			if (professionalRegistration !== undefined) {
				profileUpdate.professionalRegistration = professionalRegistration;
			}
			if (address !== undefined) profileUpdate.address = address;
			if (nextCustomFields !== undefined) profileUpdate.customFields = nextCustomFields;
			profileUpdate.updatedAt = new Date();

			const [updatedProfile] = await db
				.update(profiles)
				.set(profileUpdate)
				.where(
					and(
						eq(profiles.id, profileId),
						eq(profiles.organisationId, organisationId),
					),
				)
				.returning();

			if (membership?.userId) {
				const userUpdate: Partial<typeof users.$inferInsert> = {};
				if (firstName !== undefined) userUpdate.firstName = firstName;
				if (lastName !== undefined) userUpdate.lastName = lastName;
				if (email !== undefined) userUpdate.email = email;
				if (phone !== undefined) userUpdate.phone = phone;

				if (Object.keys(userUpdate).length > 0) {
					userUpdate.updatedAt = new Date();
					await db
						.update(users)
						.set(userUpdate)
						.where(eq(users.id, membership.userId));
				}
			}

			return {
				data: {
					profileId: updatedProfile.id,
					organisationId: updatedProfile.organisationId,
					firstName: updatedProfile.firstName,
					lastName: updatedProfile.lastName,
					email: updatedProfile.email,
					phone: updatedProfile.phone,
					dateOfBirth: updatedProfile.dateOfBirth?.toISOString().split("T")[0] ?? null,
					sex: updatedProfile.sex,
					nationalId: updatedProfile.nationalId,
					professionalRegistration: updatedProfile.professionalRegistration,
					address: updatedProfile.address ?? null,
					customFields: updatedProfile.customFields ?? null,
				},
				message: "Profile updated successfully.",
			};
		} catch (error) {
			console.error("[updateLocalProfile] Error:", error);
			return {
				error: "Failed to update local profile.",
			};
		}
	},
});
