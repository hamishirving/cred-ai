import { tool } from "ai";
import { z } from "zod";
import {
	getOrgCompliancePackages as fetchOrgCompliancePackages,
	isApiError,
} from "@/lib/api/credentially-client";
import type { CompliancePackageBasicDto } from "@/lib/api/types";

export const getOrgCompliancePackages = tool({
	description: `Get all compliance packages available in the organisation. Use this to see what packages exist before assigning one to a profile.

Use this tool when:
- User asks "what compliance packages are available?"
- User wants to assign a package but refers to it by name (need to look up the ID)
- User asks about package options for a role`,

	inputSchema: z.object({}),

	execute: async (): Promise<
		{ data: CompliancePackageBasicDto[] } | { error: string }
	> => {
		console.log("[getOrgCompliancePackages] Fetching organisation packages");

		const result = await fetchOrgCompliancePackages();

		if (isApiError(result)) {
			return { error: result.error };
		}

		return { data: result };
	},
});
