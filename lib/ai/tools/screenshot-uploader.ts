import { randomUUID } from "crypto";
import type { Page } from "playwright-core";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "documents";

type CaptureScreenshotInput = {
	page: Page;
	agentId?: string;
	executionId?: string;
	actionIndex: number;
	organisationId?: string;
	profileId?: string;
};

type CaptureScreenshotResult = {
	screenshotPath?: string;
	screenshotUrl?: string;
};

/**
 * Capture and upload a browser screenshot.
 * Never throws: returns an empty object if capture/upload fails.
 */
export async function captureAndUploadScreenshot({
	page,
	agentId,
	executionId,
	actionIndex,
	organisationId,
	profileId,
}: CaptureScreenshotInput): Promise<CaptureScreenshotResult> {
	if (!agentId || !executionId) {
		return {};
	}

	try {
		const supabase = getSupabaseAdminClient();
		const imageBuffer = await page.screenshot({
			type: "jpeg",
			quality: 60,
			fullPage: true,
		});

		const orgSegment = organisationId || "unknown-org";
		const profileSegment = profileId || "unknown-profile";
		const path = `evidence/${orgSegment}/${profileSegment}/browser/${agentId}/${executionId}/${String(actionIndex).padStart(3, "0")}-${randomUUID().slice(0, 8)}.jpg`;

		const { error: uploadError } = await supabase.storage
			.from(BUCKET)
			.upload(path, imageBuffer, {
				contentType: "image/jpeg",
				upsert: true,
			});

		if (uploadError) {
			console.warn("[screenshot-uploader] Upload failed:", uploadError.message);
			return {};
		}

		const { data: signedData } = await supabase.storage
			.from(BUCKET)
			.createSignedUrl(path, 3600);

		return {
			screenshotPath: path,
			screenshotUrl: signedData?.signedUrl || undefined,
		};
	} catch (error) {
		console.warn(
			"[screenshot-uploader] Capture/upload failed:",
			error instanceof Error ? error.message : "Unknown error",
		);
		return {};
	}
}
