import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { evidence, complianceElements, profiles } from "@/lib/db/schema";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}
const client = postgres(databaseUrl);
const db = drizzle(client);

const BUCKET = "documents";

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ id: string }> },
) {
	try {
		const params = await props.params;
		const body = await request.json();
		const {
			elementSlug,
			organisationId,
			profileId,
			fileData,
			fileName,
			mimeType,
		} = body;

		if (!elementSlug || !organisationId || !fileData) {
			return NextResponse.json(
				{ error: "elementSlug, organisationId, and fileData are required" },
				{ status: 400 },
			);
		}

		// Find the element
		const [element] = await db
			.select({ id: complianceElements.id })
			.from(complianceElements)
			.where(
				and(
					eq(complianceElements.slug, elementSlug),
					eq(complianceElements.organisationId, organisationId),
				),
			);

		if (!element) {
			return NextResponse.json(
				{ error: "Compliance element not found" },
				{ status: 404 },
			);
		}

		// Find or create the evidence record
		let [evidenceRecord] = await db
			.select({
				id: evidence.id,
				filePath: evidence.filePath,
				profileId: evidence.profileId,
			})
			.from(evidence)
			.where(
				and(
					eq(evidence.complianceElementId, element.id),
					eq(evidence.organisationId, organisationId),
					...(profileId ? [eq(evidence.profileId, profileId)] : []),
				),
			);

		if (!evidenceRecord) {
			// Verify profileId exists before inserting (FK constraint)
			let validProfileId: string | null = null;
			if (profileId) {
				const [profile] = await db
					.select({ id: profiles.id })
					.from(profiles)
					.where(eq(profiles.id, profileId));
				validProfileId = profile?.id || null;
			}

			// Create a new evidence record for this element
			const [created] = await db
				.insert(evidence)
				.values({
					complianceElementId: element.id,
					organisationId,
					profileId: validProfileId,
					placementId: params.id,
					evidenceType: "document",
					source: "user_upload",
					status: "pending",
					verificationStatus: "unverified",
					dataOwnership: "organisation",
				})
				.returning({
					id: evidence.id,
					filePath: evidence.filePath,
					profileId: evidence.profileId,
				});

			evidenceRecord = created;
		}

		// Decode base64 data URL
		const base64Match = fileData.match(/^data:([^;]+);base64,(.+)$/);
		if (!base64Match) {
			return NextResponse.json(
				{ error: "Invalid file data format — expected base64 data URL" },
				{ status: 400 },
			);
		}

		const detectedMimeType = base64Match[1];
		const buffer = Buffer.from(base64Match[2], "base64");

		// Build storage path
		const ext = detectedMimeType.includes("pdf")
			? "pdf"
			: detectedMimeType.includes("png")
				? "png"
				: detectedMimeType.includes("webp")
					? "webp"
					: "jpg";
		const storagePath = `evidence/${organisationId}/${evidenceRecord.profileId}/${elementSlug}-${evidenceRecord.id}.${ext}`;

		// Upload to Supabase storage (needs service role key for write access)
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

		if (!supabaseUrl || !supabaseKey) {
			return NextResponse.json(
				{ error: "Supabase storage not configured" },
				{ status: 500 },
			);
		}

		const supabase = createSupabaseAdmin(supabaseUrl, supabaseKey);

		// Delete old file if it exists
		if (evidenceRecord.filePath) {
			await supabase.storage.from(BUCKET).remove([evidenceRecord.filePath]);
		}

		// Upload new file
		const { error: uploadError } = await supabase.storage
			.from(BUCKET)
			.upload(storagePath, buffer, {
				contentType: detectedMimeType,
				upsert: true,
			});

		if (uploadError) {
			return NextResponse.json(
				{ error: `Upload failed: ${uploadError.message}` },
				{ status: 500 },
			);
		}

		// Update evidence record
		await db
			.update(evidence)
			.set({
				filePath: storagePath,
				fileName: fileName || `${elementSlug}.${ext}`,
				mimeType: mimeType || detectedMimeType,
				fileSize: buffer.length,
			})
			.where(eq(evidence.id, evidenceRecord.id));

		// Get signed URL for the uploaded file
		const { data: signedData } = await supabase.storage
			.from(BUCKET)
			.createSignedUrl(storagePath, 3600);

		return NextResponse.json({
			filePath: storagePath,
			signedUrl: signedData?.signedUrl || null,
		});
	} catch (error) {
		console.error("Failed to upload evidence:", error);
		return NextResponse.json(
			{
				error: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			},
			{ status: 500 },
		);
	}
}
