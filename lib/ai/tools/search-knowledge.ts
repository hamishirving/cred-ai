import { tool } from "ai";
import { cookies } from "next/headers";
import { z } from "zod";
import {
	getCompliancePackagesByOrganisationId,
	getOrganisationById,
} from "@/lib/db/queries";
import { retrieve } from "@/lib/ragie/client";
import { resolveRagiePartition } from "@/lib/ragie/partition";

/**
 * Market-aware healthcare compliance context for better retrieval and response grounding.
 */
const UK_HEALTHCARE_CONTEXT = `This knowledge base contains UK healthcare compliance documentation including:
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

const US_HEALTHCARE_CONTEXT = `This knowledge base contains US healthcare compliance documentation including:
- State and federal pre-employment screening requirements
- Vaccination and immunity documentation requirements (e.g., MMR, TDAP, Varicella, Hep B)
- TB screening and physical examination requirements
- Professional licensure and certification verification requirements
- Facility onboarding and credentialing policy guidance
- Role and placement-specific compliance documentation standards

When answering questions, cite specific policy sections or document excerpts where relevant.`;

const GENERIC_HEALTHCARE_CONTEXT = `This knowledge base contains healthcare compliance documentation relevant to the organisation.

When answering questions, cite specific policy or document excerpts where relevant.`;

// Known UK package slugs used to detect market (mirrors compliance settings page logic)
const UK_PACKAGE_SLUGS = new Set([
	"core-package",
	"nursing-package",
	"hca-package",
	"care-worker-package",
	"nhs-trust-package",
	"scotland-package",
	"doctor-package",
	"care-home-package",
]);

function detectMarketFromPackageSlugs(packageSlugs: string[]): "uk" | "us" | null {
	if (!packageSlugs.length) return null;
	const ukMatches = packageSlugs.filter((slug) => UK_PACKAGE_SLUGS.has(slug)).length;
	return ukMatches > 0 ? "uk" : "us";
}

function getHealthcareContextForMarket(market: "uk" | "us" | null): string {
	if (market === "uk") return UK_HEALTHCARE_CONTEXT;
	if (market === "us") return US_HEALTHCARE_CONTEXT;
	return GENERIC_HEALTHCARE_CONTEXT;
}

function isLikelyUkQuery(query: string): boolean {
	const q = query.toLowerCase();
	return /\b(cqc|nhs|dbs|right to work|regulation 19|gmc|nmc|hcpc)\b/.test(q);
}

export function createSearchKnowledge(defaultOrganisationId?: string) {
	return tool({
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

The tool searches uploaded compliance documents (policies, CQC guidance, procedures) and returns relevant excerpts. Use the retrieved information to provide accurate, regulation-grounded answers.

When running outside chat/browser context, pass organisationId so the correct Ragie partition is selected.`,

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
			organisationId: z
				.string()
				.uuid()
				.optional()
				.describe(
					"Organisation ID used to route to the correct Ragie partition when not in normal chat context.",
				),
		}),

		execute: async ({ query, top_k, rerank, organisationId: inputOrgId }) => {
			let organisationId = inputOrgId || defaultOrganisationId;

			if (!organisationId) {
				try {
					const cookieStore = await cookies();
					organisationId = cookieStore.get("selectedOrgId")?.value;
				} catch {
					// Cookie access may be unavailable in non-request contexts.
				}
			}

			if (!organisationId) {
				return {
					error:
						"searchKnowledge requires organisationId to select the correct Ragie partition.",
				};
			}

			let organisation = null;
			let market: "uk" | "us" | null = null;

			const [orgResult, packagesResult] = await Promise.all([
				getOrganisationById({ id: organisationId }),
				getCompliancePackagesByOrganisationId({ organisationId }).catch(() => []),
			]);
			organisation = orgResult;
			market = detectMarketFromPackageSlugs(
				packagesResult.map((pkg) => pkg.slug),
			);

			const partition = resolveRagiePartition({
				organisationId,
				organisation,
				market,
			});
			const context = getHealthcareContextForMarket(market);

			console.log("[searchKnowledge] Query:", query, {
				organisationId,
				market,
				partition,
			});

			try {
				const result = await retrieve({
					query,
					top_k: top_k ?? 5,
					rerank: rerank ?? true,
					partition,
				});

				if (!result.scored_chunks.length) {
					const likelyMismatchHint =
						market === "us" && isLikelyUkQuery(query)
							? " The query appears UK-specific, but this org resolved to US/\"usa\" partition. Verify organisationId/candidate-org selection."
							: "";
					return {
						data: null,
						context,
						partition,
						market,
						message: `No relevant documents found in Ragie partition "${partition}". You may need to answer based on general healthcare compliance knowledge, but make clear this is not from the organisation's specific documentation.${likelyMismatchHint}`,
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
					context,
					partition,
					market,
					message: `Found ${chunks.length} relevant excerpts from the compliance knowledge base. Base your answer on this information and cite the source documents.`,
				};
			} catch (error) {
				console.error("[searchKnowledge] Error:", error);
				return { error: "Failed to search knowledge base" };
			}
		},
	});
}

export const searchKnowledge = createSearchKnowledge();
