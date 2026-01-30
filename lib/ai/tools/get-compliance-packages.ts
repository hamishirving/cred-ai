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

Requires the profile ID (can be obtained from getProfile tool first).`,

	inputSchema: z.object({
		profileId: z
			.string()
			.describe("The ID of the profile to get compliance packages for"),
	}),

	execute: async ({
		profileId,
	}): Promise<{ data: CompliancePackageDto[] } | { error: string }> => {
		console.log(
			"[getCompliancePackages] Getting compliance packages for profile:",
			profileId,
		);

		const result = await fetchCompliancePackages(profileId);

		if (isApiError(result)) {
			return { error: result.error };
		}

		return { data: result };
	},
});
