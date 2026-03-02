/**
 * Get Local Documents Tool
 *
 * Queries the seeded local database for a candidate's evidence/documents.
 * Joins evidence → complianceElements so results include the requirement name.
 */

import { tool } from "ai";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { z } from "zod";
import { complianceElements, evidence } from "@/lib/db/schema";

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

export const getLocalDocuments = tool({
	description: `Get uploaded documents and evidence for a candidate from the local database.
Returns file names, evidence types, statuses, verification status, the compliance element each document fulfils, and issued/expiry dates.
Requires both profileId and organisationId.`,

	inputSchema: z.object({
		profileId: z.string().uuid().describe("The profile ID of the candidate"),
		organisationId: z
			.string()
			.uuid()
			.describe("The organisation ID the candidate belongs to"),
	}),

	execute: async ({ profileId, organisationId }) => {
		console.log(
			"[getLocalDocuments] Fetching documents for profile:",
			profileId,
		);

		const results = await db
			.select({
				id: evidence.id,
				fileName: evidence.fileName,
				evidenceType: evidence.evidenceType,
				source: evidence.source,
				status: evidence.status,
				verificationStatus: evidence.verificationStatus,
				aiConfidence: evidence.aiConfidence,
				elementName: complianceElements.name,
				elementCategory: complianceElements.category,
				issuedAt: evidence.issuedAt,
				expiresAt: evidence.expiresAt,
				verifiedAt: evidence.verifiedAt,
				createdAt: evidence.createdAt,
			})
			.from(evidence)
			.innerJoin(
				complianceElements,
				eq(evidence.complianceElementId, complianceElements.id),
			)
			.where(
				and(
					eq(evidence.profileId, profileId),
					eq(evidence.organisationId, organisationId),
				),
			)
			.orderBy(evidence.createdAt);

		if (results.length === 0) {
			return {
				data: {
					count: 0,
					documents: [],
				},
			};
		}

		return {
			data: {
				count: results.length,
				documents: results.map((r) => ({
					id: r.id,
					fileName: r.fileName,
					evidenceType: r.evidenceType,
					source: r.source,
					status: r.status,
					verificationStatus: r.verificationStatus,
					aiConfidence: r.aiConfidence,
					elementName: r.elementName,
					elementCategory: r.elementCategory,
					issuedAt: r.issuedAt?.toISOString() ?? null,
					expiresAt: r.expiresAt?.toISOString() ?? null,
					verifiedAt: r.verifiedAt?.toISOString() ?? null,
				})),
			},
		};
	},
});
