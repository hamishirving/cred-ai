import { tool } from "ai";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { createTask } from "@/lib/db/queries";
import { mockAdmins } from "@/lib/data/mock-admins";
import { orgMemberships, profiles, users } from "@/lib/db/schema";
import type { FollowupCallStructuredData } from "@/lib/voice/types";

const addressSchema = z.object({
	line1: z.string().optional(),
	line2: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	postcode: z.string().optional(),
	country: z.string().optional(),
});

const transcriptMessageSchema = z.object({
	role: z.string(),
	content: z.string(),
	timestamp: z.number().optional(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const next = value.trim();
	return next.length > 0 ? next : undefined;
}

function getStructuredSource(capturedData: unknown): Record<string, unknown> | null {
	if (typeof capturedData === "string") {
		try {
			const parsed = JSON.parse(capturedData);
			if (isRecord(parsed)) {
				capturedData = parsed;
			}
		} catch {
			return null;
		}
	}

	if (!isRecord(capturedData)) return null;

	const analysis = capturedData.analysis;
	if (isRecord(analysis) && isRecord(analysis.structuredData)) {
		return analysis.structuredData;
	}

	if (isRecord(capturedData.structuredData)) {
		return capturedData.structuredData;
	}

	return capturedData;
}

function normalizeStructuredData(capturedData: unknown): FollowupCallStructuredData | null {
	const source = getStructuredSource(capturedData);
	if (!source) return null;

	const updatesSource = isRecord(source.updates) ? source.updates : source;
	const normalizedUpdates: NonNullable<FollowupCallStructuredData["updates"]> = {};

	const phone = nonEmptyString(updatesSource.phone);
	if (phone) normalizedUpdates.phone = phone;

	const email = nonEmptyString(updatesSource.email);
	if (email) normalizedUpdates.email = email;

	const professionalRegistration = nonEmptyString(
		updatesSource.professionalRegistration,
	);
	if (professionalRegistration) {
		normalizedUpdates.professionalRegistration = professionalRegistration;
	}

	const firstName = nonEmptyString(updatesSource.firstName);
	if (firstName) normalizedUpdates.firstName = firstName;

	const lastName = nonEmptyString(updatesSource.lastName);
	if (lastName) normalizedUpdates.lastName = lastName;

	const dateOfBirth = nonEmptyString(updatesSource.dateOfBirth);
	if (dateOfBirth) normalizedUpdates.dateOfBirth = dateOfBirth;

	const nationalId = nonEmptyString(updatesSource.nationalId);
	if (nationalId) normalizedUpdates.nationalId = nationalId;

	const addressValue = updatesSource.address;
	if (isRecord(addressValue)) {
		const address = {
			line1: nonEmptyString(addressValue.line1),
			line2: nonEmptyString(addressValue.line2),
			city: nonEmptyString(addressValue.city),
			state: nonEmptyString(addressValue.state),
			postcode: nonEmptyString(addressValue.postcode),
			country: nonEmptyString(addressValue.country),
		};
		if (
			address.line1 ||
			address.line2 ||
			address.city ||
			address.state ||
			address.postcode ||
			address.country
		) {
			normalizedUpdates.address = address;
		}
	}

	const candidateQuestions = Array.isArray(source.candidateQuestions)
		? source.candidateQuestions.filter(
				(value): value is string =>
					typeof value === "string" && value.trim().length > 0,
			)
		: undefined;

	const summary = nonEmptyString(source.summary);

	if (
		!Object.keys(normalizedUpdates).length &&
		!candidateQuestions?.length &&
		!summary
	) {
		return null;
	}

	return {
		updates: Object.keys(normalizedUpdates).length ? normalizedUpdates : undefined,
		candidateQuestions: candidateQuestions?.length ? candidateQuestions : undefined,
		summary,
	};
}

function buildTranscriptSnippet(
	transcript: Array<{ role: string; content: string; timestamp?: number }> | undefined,
): string {
	if (!transcript?.length) return "Transcript not available.";

	return transcript
		.slice(0, 6)
		.map((message) => `${message.role}: ${message.content}`)
		.join("\n");
}

export const applyFollowupVoiceOutcomeTool = tool({
	description: `Apply structured outcomes from a follow-up voice call.
This tool auto-updates only low-risk profile fields and creates review tasks for sensitive identity fields.
Sensitive fields that always require review: firstName, lastName, dateOfBirth, nationalId.`,

	inputSchema: z.object({
		profileId: z.string().uuid().describe("Candidate profile ID"),
		organisationId: z.string().uuid().describe("Organisation ID"),
		capturedData: z
			.unknown()
			.describe("Captured call data from getCallStatus (artifact or analysis output)"),
		transcript: z
			.array(transcriptMessageSchema)
			.optional()
			.describe("Optional transcript messages for review tasks"),
		callId: z.string().uuid().optional().describe("Internal voice call ID"),
		assigneeFirstName: z
			.string()
			.default("Sarah")
			.describe("Team member first name to assign review tasks"),
		agentId: z
			.string()
			.default("voice-followup-companion")
			.describe("Agent ID creating review tasks"),
	}),

	execute: async ({
		profileId,
		organisationId,
		capturedData,
		transcript,
		callId,
		assigneeFirstName,
		agentId,
	}) => {
		console.log("[applyFollowupVoiceOutcome] Processing voice outcome:", {
			profileId,
			organisationId,
			callId,
		});

		try {
			const [existingProfile] = await db
				.select({
					id: profiles.id,
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

			const assignee =
				mockAdmins.find(
					(admin) =>
						admin.firstName.toLowerCase() === assigneeFirstName.toLowerCase(),
				) ?? mockAdmins[0];

			const normalized = normalizeStructuredData(capturedData);
			const updatedFields: string[] = [];
			const skippedSensitiveFields: string[] = [];
			const tasksCreated: Array<{ id: string; title: string }> = [];

			if (!normalized) {
				const task = await createTask({
					title: "Review follow-up voice call (no structured output)",
					description: `No structured data could be extracted from follow-up voice call${
						callId ? ` ${callId}` : ""
					}. Review transcript and update candidate profile manually.\n\nTranscript snippet:\n${buildTranscriptSnippet(transcript)}`,
					assigneeId: assignee.id,
					priority: "medium",
					category: "follow_up",
					subjectType: "profile",
					subjectId: profileId,
					organisationId,
					source: "ai_agent",
					agentId,
				});

				tasksCreated.push({ id: task.id, title: task.title });

				return {
					data: {
						updatedFields,
						skippedSensitiveFields,
						tasksCreated,
						summary:
							"No structured updates found. Created manual review task for compliance team.",
					},
				};
			}

			const updates = normalized.updates ?? {};

			const profileUpdate: Partial<typeof profiles.$inferInsert> = {};
			const userUpdate: Partial<typeof users.$inferInsert> = {};

			const phone = nonEmptyString(updates.phone);
			if (phone) {
				profileUpdate.phone = phone;
				userUpdate.phone = phone;
				updatedFields.push("phone");
			}

			const email = nonEmptyString(updates.email);
			if (email) {
				const emailCheck = z.string().email().safeParse(email);
				if (emailCheck.success) {
					profileUpdate.email = email;
					userUpdate.email = email;
					updatedFields.push("email");
				}
			}

			const professionalRegistration = nonEmptyString(
				updates.professionalRegistration,
			);
			if (professionalRegistration) {
				profileUpdate.professionalRegistration = professionalRegistration;
				updatedFields.push("professionalRegistration");
			}

			if (updates.address) {
				const parsedAddress = addressSchema.safeParse(updates.address);
				if (parsedAddress.success) {
					profileUpdate.address = parsedAddress.data;
					updatedFields.push("address");
				}
			}

			const firstName = nonEmptyString(updates.firstName);
			if (firstName) skippedSensitiveFields.push("firstName");
			const lastName = nonEmptyString(updates.lastName);
			if (lastName) skippedSensitiveFields.push("lastName");
			const dateOfBirth = nonEmptyString(updates.dateOfBirth);
			if (dateOfBirth) skippedSensitiveFields.push("dateOfBirth");
			const nationalId = nonEmptyString(updates.nationalId);
			if (nationalId) skippedSensitiveFields.push("nationalId");

			if (Object.keys(profileUpdate).length > 0) {
				profileUpdate.updatedAt = new Date();
				await db
					.update(profiles)
					.set(profileUpdate)
					.where(
						and(
							eq(profiles.id, profileId),
							eq(profiles.organisationId, organisationId),
						),
					);

				if (Object.keys(userUpdate).length > 0) {
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

					if (membership?.userId) {
						userUpdate.updatedAt = new Date();
						await db
							.update(users)
							.set(userUpdate)
							.where(eq(users.id, membership.userId));
					}
				}
			}

			if (skippedSensitiveFields.length > 0) {
				const requestedSensitiveChanges = {
					firstName,
					lastName,
					dateOfBirth,
					nationalId,
				};

				const task = await createTask({
					title: "Review sensitive profile update from voice follow-up",
					description: `Candidate requested sensitive profile updates that require review.${
						callId ? `\nCall ID: ${callId}` : ""
					}\n\nRequested fields:\n${JSON.stringify(requestedSensitiveChanges, null, 2)}\n\nTranscript snippet:\n${buildTranscriptSnippet(transcript)}`,
					assigneeId: assignee.id,
					priority: skippedSensitiveFields.length > 1 ? "high" : "medium",
					category: "escalation",
					subjectType: "profile",
					subjectId: profileId,
					organisationId,
					source: "ai_agent",
					agentId,
				});

				tasksCreated.push({ id: task.id, title: task.title });
			}

			const summaryParts: string[] = [];
			summaryParts.push(
				updatedFields.length
					? `Updated low-risk fields: ${updatedFields.join(", ")}.`
					: "No low-risk fields were auto-updated.",
			);
			if (skippedSensitiveFields.length) {
				summaryParts.push(
					`Sensitive fields queued for review: ${skippedSensitiveFields.join(", ")}.`,
				);
			}
			if (tasksCreated.length) {
				summaryParts.push(
					`Created ${tasksCreated.length} review task${tasksCreated.length === 1 ? "" : "s"}.`,
				);
			}

			return {
				data: {
					updatedFields,
					skippedSensitiveFields,
					tasksCreated,
					summary: summaryParts.join(" "),
				},
			};
		} catch (error) {
			console.error("[applyFollowupVoiceOutcome] Error:", error);
			return {
				error: "Failed to apply follow-up voice outcome.",
			};
		}
	},
});
