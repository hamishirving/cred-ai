import { tool } from "ai";
import { z } from "zod";
import {
	assignCompliancePackages,
	isApiError,
} from "@/lib/api/credentially-client";
import type { CompliancePackageDto } from "@/lib/api/types";

export const assignCompliancePackage = tool({
	description: `Assign compliance packages to a profile.

IMPORTANT: Before using this tool:
1. You MUST know the profileId - if user refers to someone by name/email, use getProfile first
2. You MUST know the package ID(s) - if user refers to package by name, use getOrgCompliancePackages first to find the ID
3. If the user's request is ambiguous (e.g. "assign a compliance package"), ask them which package they want

Do NOT guess package IDs - always look them up first.`,

	inputSchema: z.object({
		profileId: z
			.string()
			.describe(
				"The profile ID to assign packages to. Must be a valid profile ID, not a name or email.",
			),
		packageIds: z
			.array(z.string())
			.min(1)
			.describe(
				"Array of compliance package IDs to assign. Must be valid package IDs from getOrgCompliancePackages.",
			),
	}),

	execute: async ({
		profileId,
		packageIds,
	}): Promise<
		{ data: CompliancePackageDto[]; message: string } | { error: string }
	> => {
		console.log(
			"[assignCompliancePackage] Assigning packages to profile:",
			profileId,
			"packages:",
			packageIds,
		);

		const result = await assignCompliancePackages(profileId, packageIds);

		if (isApiError(result)) {
			return { error: result.error };
		}

		return {
			data: result,
			message: `Successfully assigned ${packageIds.length} compliance package(s) to profile`,
		};
	},
});
