import { tool } from "ai";
import { z } from "zod";
import {
	getCompliancePackages as fetchCompliancePackages,
	isApiError,
} from "@/lib/api/credentially-client";
import type { CompliancePackageDto } from "@/lib/api/types";

export const getCompliancePackages = tool({
	description: `Get compliance package requirements and status for a candidate.
Use this tool when the user asks about:
- Compliance packages assigned to an employee
- Compliance requirements (documents, references, integrations, text requirements)
- Compliance status for specific requirements
- What documents or checks are needed for compliance
- Progress towards meeting compliance requirements

Requires the profile ID (can be obtained from getProfile tool first).
Organisation ID is optional - defaults to the configured organisation.`,

	inputSchema: z.object({
		profileId: z
			.string()
			.describe("The ID of the profile to get compliance packages for"),
		organisationId: z
			.string()
			.optional()
			.describe(
				"The organisation ID (optional, defaults to configured organisation)",
			),
	}),

	execute: async ({
		profileId,
		organisationId,
	}): Promise<{ data: CompliancePackageDto[] } | { error: string }> => {
		console.log(
			"[getCompliancePackages] Getting compliance packages for profile:",
			profileId,
			organisationId ? `org: ${organisationId}` : "",
		);

		const result = await fetchCompliancePackages(profileId, organisationId);

		if (isApiError(result)) {
			return { error: result.error };
		}

		return { data: result };
	},
});
