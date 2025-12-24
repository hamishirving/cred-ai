import { tool } from "ai";
import { z } from "zod";
import { apiCall } from "@/lib/api/client";
import type { Customer, ToolError } from "@/lib/api/types";

export const getCustomer = tool({
	description: `Get customer information. Use this when the user asks about:
- Customer details, profile, or info
- Looking up a customer by ID
- Searching for a customer by name or email
- Customer status or account information`,

	inputSchema: z.object({
		customerId: z
			.string()
			.describe("The customer ID to look up directly")
			.optional(),
		searchTerm: z
			.string()
			.describe("Search term to find customers (name, email, etc)")
			.optional(),
	}),

	execute: async ({
		customerId,
		searchTerm,
	}): Promise<Customer | Customer[] | ToolError> => {
		try {
			if (customerId) {
				return await apiCall<Customer>(`/customers/${customerId}`);
			}

			if (searchTerm) {
				return await apiCall<Customer[]>(
					`/customers/search?q=${encodeURIComponent(searchTerm)}`,
				);
			}

			return { error: "Please provide a customer ID or search term" };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return { error: message };
		}
	},
});
