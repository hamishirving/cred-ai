/**
 * FA Get Packages Tool
 *
 * Lists available First Advantage screening packages.
 */

import { tool } from "ai";
import { z } from "zod";
import { getFAClient } from "@/lib/api/first-advantage/client";

export const faGetPackages = tool({
	description: `List available First Advantage screening packages.
Returns all packages configured for this account with their screening components.
Use this to show the client what screening options are available.`,

	inputSchema: z.object({}),

	execute: async () => {
		try {
			const client = getFAClient();
			const packages = await client.getPackages();
			return { data: packages };
		} catch (error) {
			return {
				error: `Failed to get packages: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	},
});
