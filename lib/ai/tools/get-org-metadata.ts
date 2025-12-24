import { tool } from "ai";
import { z } from "zod";
import {
	getOrganisationMetadata,
	isApiError,
} from "@/lib/api/credentially-client";
import type { OrganisationMetadataDto } from "@/lib/api/types";

export const getMetadata = tool({
	description: `Get organisation metadata including available custom fields and roles.
Use this tool when you need to:
- See what custom profile fields are available
- Get the schema/type of custom fields
- List available roles in the organisation
- Validate field names before creating forms
- Understand the organisation's data structure

No input required - fetches metadata for the configured organisation.`,

	inputSchema: z.object({
		// No input needed - uses configured org ID
	}),

	execute: async (): Promise<
		{ data: OrganisationMetadataDto } | { error: string }
	> => {
		console.log("[getMetadata] Fetching organisation metadata");

		const result = await getOrganisationMetadata();

		if (isApiError(result)) {
			return { error: result.error };
		}

		return { data: result };
	},
});
