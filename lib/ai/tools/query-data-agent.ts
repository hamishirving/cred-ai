import { tool } from "ai";
import { GoogleAuth } from "google-auth-library";
import { z } from "zod";

const BILLING_PROJECT =
	process.env.GEMINI_BILLING_PROJECT ?? "arched-proton-478514-s5";
const LOCATION = "global";
const AGENT_ID =
	process.env.GEMINI_AGENT_ID ?? "agent_55883a2d-c26d-42f9-8c67-5a675127dfcd";

const BASE_URL = "https://geminidataanalytics.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 2;

// Initialize Google Auth - uses GOOGLE_APPLICATION_CREDENTIALS env var
const auth = new GoogleAuth({
	scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function getAccessToken(): Promise<string> {
	const client = await auth.getClient();
	const token = await client.getAccessToken();
	if (!token.token) {
		throw new Error("Failed to get access token");
	}
	return token.token;
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

type DataAgentEvent = {
	systemMessage?: {
		text?: {
			parts?: unknown[];
			textType?: string;
		};
		data?: {
			generatedSql?: string;
			result?: unknown;
			bigQueryJob?: {
				jobId?: string;
				projectId?: string;
			};
		};
		chart?: {
			result?: unknown;
		};
	};
};

type NormalizedDataAgentResponse = {
	summary: string;
	sql?: string;
	result?: unknown;
	chart?: unknown;
	metadata: {
		elapsedMs: number;
		eventCount: number;
		jobId?: string;
	};
};

function toText(parts: unknown[]): string {
	return parts
		.map((part) => (typeof part === "string" ? part : ""))
		.filter(Boolean)
		.join("\n");
}

/**
 * Fallback parser: extract top-level JSON objects from mixed/plain text.
 */
function extractJsonObjects(input: string): unknown[] {
	const objects: unknown[] = [];
	let depth = 0;
	let start = -1;
	let inString = false;
	let escaped = false;

	for (let i = 0; i < input.length; i++) {
		const char = input[i];

		if (inString) {
			if (escaped) {
				escaped = false;
				continue;
			}
			if (char === "\\") {
				escaped = true;
				continue;
			}
			if (char === '"') {
				inString = false;
			}
			continue;
		}

		if (char === '"') {
			inString = true;
			continue;
		}

		if (char === "{") {
			if (depth === 0) start = i;
			depth++;
			continue;
		}

		if (char === "}") {
			if (depth === 0) continue;
			depth--;
			if (depth === 0 && start >= 0) {
				const candidate = input.slice(start, i + 1);
				start = -1;
				try {
					objects.push(JSON.parse(candidate));
				} catch {
					// Ignore invalid object fragments
				}
			}
		}
	}

	return objects;
}

function parseDataAgentEvents(rawText: string): DataAgentEvent[] {
	try {
		const parsed = JSON.parse(rawText);
		if (Array.isArray(parsed)) {
			return parsed as DataAgentEvent[];
		}
		if (parsed && typeof parsed === "object") {
			return [parsed as DataAgentEvent];
		}
	} catch {
		// Fall back to object extraction below
	}

	return extractJsonObjects(rawText).filter(
		(item): item is DataAgentEvent =>
			typeof item === "object" && item !== null,
	);
}

export const queryDataAgent = tool({
	description: `Query the BigQuery data mart for analytics and reporting data using natural language.
Use this tool when the user asks about:
- Analytics, metrics, or KPIs
- Data reports or dashboards
- Aggregations, counts, or statistics from the data warehouse
- Questions that require SQL queries against BigQuery

Pass the user's question directly as the prompt.`,

	inputSchema: z.object({
		prompt: z
			.string()
			.describe("The user's analytics question to query the data mart"),
	}),

	execute: async ({
		prompt,
	}): Promise<{ data: unknown } | { error: string }> => {
		const url = `${BASE_URL}/projects/${BILLING_PROJECT}/locations/global:chat`;
		console.log("[queryDataAgent] Request URL:", url);
		console.log("[queryDataAgent] Prompt:", prompt);
		const startedAt = Date.now();

		try {
			// Get fresh access token (auto-refreshes)
			console.log("[queryDataAgent] Getting access token...");
			const accessToken = await getAccessToken();
			console.log("[queryDataAgent] Got access token");

			const payload = {
				parent: `projects/${BILLING_PROJECT}/locations/global`,
				messages: [
					{
						userMessage: {
							text: prompt,
						},
					},
				],
				data_agent_context: {
					data_agent: `projects/${BILLING_PROJECT}/locations/${LOCATION}/dataAgents/${AGENT_ID}`,
				},
			};

			let res: Response | null = null;
			let text = "";
			let lastError: unknown = null;

			for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
				const controller = new AbortController();
				const timeoutId = setTimeout(
					() => controller.abort(),
					REQUEST_TIMEOUT_MS,
				);
				try {
					console.log(
						`[queryDataAgent] Sending request (attempt ${attempt}/${MAX_ATTEMPTS})...`,
					);
					res = await fetch(url, {
						method: "POST",
						headers: {
							Authorization: `Bearer ${accessToken}`,
							"Content-Type": "application/json",
							"x-server-timeout": "120",
						},
						body: JSON.stringify(payload),
						signal: controller.signal,
					});
					text = await res.text();
					clearTimeout(timeoutId);

					const shouldRetry =
						(res.status >= 500 || res.status === 429) &&
						attempt < MAX_ATTEMPTS;
					if (shouldRetry) {
						console.warn(
							`[queryDataAgent] Attempt ${attempt} failed (${res.status}), retrying...`,
						);
						await delay(500 * attempt);
						continue;
					}
					break;
				} catch (error) {
					clearTimeout(timeoutId);
					lastError = error;
					const retryable =
						attempt < MAX_ATTEMPTS &&
						error instanceof Error &&
						(error.name === "AbortError" || error.name === "TypeError");
					if (!retryable) {
						throw error;
					}
					console.warn(
						`[queryDataAgent] Attempt ${attempt} failed (${error.name}), retrying...`,
					);
					await delay(500 * attempt);
				}
			}

			if (!res) {
				throw lastError instanceof Error
					? lastError
					: new Error("No response from data agent");
			}

			console.log(
				"[queryDataAgent] Response status:",
				res.status,
				res.statusText,
			);
			console.log(
				"[queryDataAgent] Response length:",
				text.length,
				"chars",
			);

			if (!res.ok) {
				const errorPreview =
					text.length > 300 ? `${text.slice(0, 300)}...` : text;
				return {
					error: `Data agent returned ${res.status}: ${res.statusText}. ${errorPreview}`,
				};
			}

			const events = parseDataAgentEvents(text);
			if (events.length === 0) {
				return {
					data: {
						summary:
							"Query completed, but the response format was not recognised.",
						metadata: {
							elapsedMs: Date.now() - startedAt,
							eventCount: 0,
						},
					},
				};
			}
			return {
				data: extractDataAgentResponse(events, Date.now() - startedAt),
			};
		} catch (error) {
			console.error("[queryDataAgent] Fetch error:", error);
			if (error instanceof Error && error.name === "AbortError") {
				return {
					error: `Request timed out after ${Math.round(REQUEST_TIMEOUT_MS / 1000)} seconds`,
				};
			}
			const message = error instanceof Error ? error.message : String(error);
			return { error: `Failed to query data agent: ${message}` };
		}
	},
});

function extractDataAgentResponse(
	events: DataAgentEvent[],
	elapsedMs: number,
): NormalizedDataAgentResponse {
	const finalResponses: string[] = [];
	let fallbackText = "";
	let sql: string | undefined;
	let queryResult: unknown;
	let chart: unknown;
	let jobId: string | undefined;

	for (const item of events) {
		const message = item.systemMessage;
		if (!message) continue;

		if (message.text?.parts && Array.isArray(message.text.parts)) {
			const nextText = toText(message.text.parts);
			if (nextText) {
				if (message.text.textType === "FINAL_RESPONSE") {
					finalResponses.push(nextText);
				}
				fallbackText = nextText;
			}
		}

		if (message.data?.generatedSql) {
			sql = message.data.generatedSql;
		}
		if (message.data?.result) {
			queryResult = message.data.result;
		}
		if (message.data?.bigQueryJob?.jobId) {
			jobId = message.data.bigQueryJob.jobId;
		}
		if (message.chart?.result) {
			chart = message.chart.result;
		}
	}

	const summary =
		finalResponses.join("\n\n").trim() ||
		fallbackText ||
		"Query completed successfully.";

	return {
		summary,
		sql,
		result: queryResult,
		chart,
		metadata: {
			elapsedMs,
			eventCount: events.length,
			jobId,
		},
	};
}
