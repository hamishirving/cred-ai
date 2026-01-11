import { tool } from "ai";
import { z } from "zod";
import { retrieve } from "@/lib/ragie/client";

/**
 * Healthcare compliance context for better retrieval and response grounding.
 * This helps the AI understand the domain when searching and responding.
 */
const HEALTHCARE_CONTEXT = `This knowledge base contains healthcare compliance documentation including:
- CQC (Care Quality Commission) regulations and guidance
- NHS Employers standards and requirements
- DBS (Disclosure and Barring Service) policies
- Right to Work verification procedures
- Professional registration requirements (NMC, GMC, HCPC)
- Safeguarding policies and training requirements
- Fit and Proper Persons requirements (Regulation 5)
- Employment requirements (Regulation 19)
- Training and competency frameworks

When answering questions, cite specific regulations or document sections where relevant.`;

export const searchKnowledge = tool({
	description: `Search the organisation's healthcare compliance knowledge base for relevant information.

Use this tool when the user asks about:
- CQC regulations, requirements, or guidance
- Employment compliance (Regulation 19, Schedule 3)
- DBS checks, enhanced DBS, update service
- Right to Work verification procedures
- Professional registration (NMC, GMC, HCPC) requirements
- References and employment history verification
- Safeguarding training and policies
- Fit and Proper Persons (Regulation 5)
- NHS Employers standards
- Any "What does our policy say about..." questions

The tool searches uploaded compliance documents (policies, CQC guidance, procedures) and returns relevant excerpts. Use the retrieved information to provide accurate, regulation-grounded answers.`,

	inputSchema: z.object({
		query: z
			.string()
			.describe(
				"The search query - be specific about the compliance topic (e.g., 'CQC Regulation 19 references requirements' not just 'references')",
			),
		top_k: z
			.number()
			.optional()
			.default(5)
			.describe("Number of results (default 5)"),
		rerank: z
			.boolean()
			.optional()
			.default(true)
			.describe("Use reranking for better accuracy"),
	}),

	execute: async ({ query, top_k, rerank }) => {
		console.log("[searchKnowledge] Query:", query);

		try {
			const result = await retrieve({
				query,
				top_k: top_k ?? 5,
				rerank: rerank ?? true,
			});

			if (!result.scored_chunks.length) {
				return {
					data: null,
					context: HEALTHCARE_CONTEXT,
					message:
						"No relevant documents found. You may need to answer based on general healthcare compliance knowledge, but make clear this is not from the organisation's specific documentation.",
				};
			}

			// Format chunks for the AI, including source URL if available
			const chunks = result.scored_chunks.map((chunk) => ({
				text: chunk.text,
				source: chunk.document_name,
				sourceUrl: chunk.document_metadata.source_url || null,
				documentType: chunk.document_metadata.document_type || null,
				score: chunk.score,
			}));

			return {
				data: chunks,
				context: HEALTHCARE_CONTEXT,
				message: `Found ${chunks.length} relevant excerpts from the compliance knowledge base. Base your answer on this information and cite the source documents.`,
			};
		} catch (error) {
			console.error("[searchKnowledge] Error:", error);
			return { error: "Failed to search knowledge base" };
		}
	},
});
