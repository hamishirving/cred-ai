import { tool } from "ai";
import { z } from "zod";
import { updateReferenceContact } from "@/lib/db/queries";

/**
 * Tool for updating a reference contact's status and captured data.
 *
 * Called after a voice reference check to record the outcome —
 * whether it completed successfully and what data was captured.
 */
export const updateReferenceStatusTool = tool({
	description: `Update a reference contact's status and captured data after a reference check.
Use this after evaluating call results to mark the reference as completed or failed,
and to store the captured data (confirmed job title, dates, rehire eligibility, etc.).`,

	inputSchema: z.object({
		referenceContactId: z
			.string()
			.uuid()
			.describe("ID of the reference contact record to update"),
		status: z
			.enum(["pending", "contacted", "completed", "failed"])
			.describe("New status for the reference"),
		capturedData: z
			.record(z.unknown())
			.optional()
			.describe("Data captured during the reference check"),
	}),

	execute: async ({ referenceContactId, status, capturedData }) => {
		console.log("[updateReferenceStatus] Updating:", { referenceContactId, status });

		try {
			const result = await updateReferenceContact({
				id: referenceContactId,
				status,
				capturedData,
			});

			return {
				data: {
					id: result.id,
					status: result.status,
					success: true,
				},
			};
		} catch (error) {
			console.error("[updateReferenceStatus] Error:", error);
			return { error: "Failed to update reference contact status." };
		}
	},
});
