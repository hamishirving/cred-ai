/**
 * uploadDocumentEvidence Tool
 *
 * Links an already-stored file to a compliance element as evidence.
 * Finds the active placement automatically and creates/updates the evidence record.
 * Used after storeAttachment + classifyDocument to wire documents into compliance.
 */

import { tool } from "ai";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { evidence, complianceElements, profiles } from "@/lib/db/schema";
import { getActivePlacementByProfileId } from "@/lib/db/queries";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

const BUCKET = "documents";

export const uploadDocumentEvidence = tool({
	description: `Links an already-stored file to a compliance element as evidence.
Finds the active placement automatically and creates or updates the evidence record.

When to use:
- After storeAttachment and classifyDocument, to attach a file to a compliance requirement
- When you've identified which compliance element a document belongs to`,

	inputSchema: z.object({
		storagePath: z.string().describe("Supabase storage path from storeAttachment"),
		fileName: z.string().describe("Original filename"),
		contentType: z.string().describe("MIME type of the file"),
		fileSize: z.number().describe("File size in bytes"),
		elementSlug: z.string().describe("Compliance element slug to attach evidence to"),
		organisationId: z.string().uuid().describe("Organisation ID"),
		profileId: z.string().uuid().describe("Candidate profile ID"),
	}),

	execute: async ({
		storagePath,
		fileName,
		contentType,
		fileSize,
		elementSlug,
		organisationId,
		profileId,
	}): Promise<
		| {
				data: {
					evidenceId: string;
					signedUrl: string;
					elementSlug: string;
					elementName: string;
					placementId: string;
				};
		  }
		| { error: string }
	> => {
		console.log("[uploadDocumentEvidence] Linking", fileName, "to element:", elementSlug);

		try {
			// 1. Look up compliance element
			const [element] = await db
				.select({ id: complianceElements.id, name: complianceElements.name })
				.from(complianceElements)
				.where(
					and(
						eq(complianceElements.slug, elementSlug),
						eq(complianceElements.organisationId, organisationId),
					),
				);

			if (!element) {
				return { error: `Compliance element not found: ${elementSlug}` };
			}

			// 2. Find active placement
			const placement = await getActivePlacementByProfileId({
				profileId,
				organisationId,
			});

			if (!placement) {
				return { error: `No active placement found for profile ${profileId}` };
			}

			// 3. Find existing evidence record or create one
			let [evidenceRecord] = await db
				.select({ id: evidence.id })
				.from(evidence)
				.where(
					and(
						eq(evidence.complianceElementId, element.id),
						eq(evidence.organisationId, organisationId),
						eq(evidence.profileId, profileId),
					),
				);

			if (!evidenceRecord) {
				// Verify profile exists (FK constraint)
				const [profile] = await db
					.select({ id: profiles.id })
					.from(profiles)
					.where(eq(profiles.id, profileId));

				if (!profile) {
					return { error: `Profile not found: ${profileId}` };
				}

				const [created] = await db
					.insert(evidence)
					.values({
						complianceElementId: element.id,
						organisationId,
						profileId,
						placementId: placement.id,
						evidenceType: "document",
						source: "ai_extraction",
						status: "pending",
						verificationStatus: "unverified",
						dataOwnership: "organisation",
					})
					.returning({ id: evidence.id });

				evidenceRecord = created;
			}

			// 4. Update evidence with file info
			await db
				.update(evidence)
				.set({
					filePath: storagePath,
					fileName,
					mimeType: contentType,
					fileSize,
					updatedAt: new Date(),
				})
				.where(eq(evidence.id, evidenceRecord.id));

			// 5. Generate signed URL
			const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
			const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

			let signedUrl = "";
			if (supabaseUrl && supabaseKey) {
				const supabase = createSupabaseAdmin(supabaseUrl, supabaseKey);
				const { data: signedData } = await supabase.storage
					.from(BUCKET)
					.createSignedUrl(storagePath, 3600);
				signedUrl = signedData?.signedUrl || "";
			}

			return {
				data: {
					evidenceId: evidenceRecord.id,
					signedUrl,
					elementSlug,
					elementName: element.name,
					placementId: placement.id,
				},
			};
		} catch (error) {
			console.error("[uploadDocumentEvidence] Error:", error);
			return {
				error: `Failed to upload evidence: ${error instanceof Error ? error.message : "Unknown error"}`,
			};
		}
	},
});
