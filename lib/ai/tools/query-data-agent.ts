import { tool } from "ai";
import { GoogleAuth } from "google-auth-library";
import { z } from "zod";

const BILLING_PROJECT =
	process.env.GEMINI_BILLING_PROJECT ?? "arched-proton-478514-s5";
const LOCATION = "global";
const AGENT_ID =
	process.env.GEMINI_AGENT_ID ?? "agent_55883a2d-c26d-42f9-8c67-5a675127dfcd";

const BASE_URL = "https://geminidataanalytics.googleapis.com/v1beta";

// Initialize Google Auth - uses GOOGLE_APPLICATION_CREDENTIALS env var
const auth = new GoogleAuth({
	scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

async function getAccessToken(): Promise<string> {
	const client = await auth.getClient();
	const token = await client.getAccessToken();
	if (!token.token) {
		throw new Error("Failed to get access token");
	}
	return token.token;
}

export const queryDataAgent = tool({
	description: `Query the BigQuery data mart for analytics and reporting data using natural language.
Use this tool when the user asks about:
- Analytics, metrics, or KPIs
- Data reports or dashboards
- Aggregations, counts, or statistics from the data warehouse
- Questions that require SQL queries against BigQuery
- Charts, graphs, visualisations, trend lines, pie charts, bar charts, or time-series views

For chart requests:
- Include chart intent in the prompt (for example pie, bar, line)
- Ask for chart metadata/config so the UI can render the chart type correctly
- Still return the underlying table data and generated SQL`,

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

		try {
			// Get fresh access token (auto-refreshes)
			console.log("[queryDataAgent] Getting access token...");
			const accessToken = await getAccessToken();
			console.log("[queryDataAgent] Got access token");

			const enrichedPrompt = `${prompt}

Return structured analytics output. Always include:
1) generated SQL
2) tabular result data with schema

If the request asks for a chart/graph/visualisation/dashboard/trend, also include:
3) chart query intent
4) chart result config (for example Vega config) with explicit chart type and field mappings.`;

			const payload = {
				parent: `projects/${BILLING_PROJECT}/locations/global`,
				messages: [
					{
						userMessage: {
							text: enrichedPrompt,
						},
					},
				],
				data_agent_context: {
					data_agent: `projects/${BILLING_PROJECT}/locations/${LOCATION}/dataAgents/${AGENT_ID}`,
				},
			};

			// Add timeout (5 minutes - Gemini Data Analytics can be slow)
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 300_000);

			console.log("[queryDataAgent] Sending request...");
			const res = await fetch(url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
					"x-server-timeout": "300",
				},
				body: JSON.stringify(payload),
				signal: controller.signal,
			});

			clearTimeout(timeoutId);

			console.log(
				"[queryDataAgent] Response status:",
				res.status,
				res.statusText,
			);

			const text = await res.text();
			console.log("[queryDataAgent] Response body (full):", text);

			if (!res.ok) {
				return {
					error: `Data agent returned ${res.status}: ${res.statusText}`,
				};
			}

			// Parse the streaming JSON response
			// The API returns an array of JSON objects
			try {
				const data = JSON.parse(text);
				return { data: extractDataAgentResponse(data) };
			} catch {
				// If not valid JSON array, return as text
				return { data: text };
			}
		} catch (error) {
			console.error("[queryDataAgent] Fetch error:", error);
			if (error instanceof Error && error.name === "AbortError") {
				return { error: "Request timed out after 5 minutes" };
			}
			const message = error instanceof Error ? error.message : String(error);
			return { error: `Failed to query data agent: ${message}` };
		}
	},
});

// Helper to extract meaningful content from the API response
function extractDataAgentResponse(response: unknown): unknown {
	if (!Array.isArray(response)) {
		return response;
	}

	const result: {
		text?: string;
		sql?: string;
		data?: unknown;
		chart?: {
			type?: "pie" | "bar" | "line";
			title?: string;
			dataResultName?: string;
			instructions?: string;
			vegaConfig?: unknown;
			data?: unknown[];
			xField?: string;
			yField?: string;
			categoryField?: string;
			valueField?: string;
		};
	} = {};

	for (const item of response) {
		if (item.systemMessage) {
			const msg = item.systemMessage;

			if (msg.text?.parts) {
				result.text = msg.text.parts.join("");
			}
			if (msg.data?.generatedSql) {
				result.sql = msg.data.generatedSql;
			}
			if (msg.data?.result) {
				result.data = msg.data.result;
			}

			if (msg.chart?.query) {
				const chartQuery = msg.chart.query;
				result.chart = {
					...result.chart,
					dataResultName:
						typeof chartQuery.dataResultName === "string"
							? chartQuery.dataResultName
							: result.chart?.dataResultName,
					instructions:
						typeof chartQuery.instructions === "string"
							? chartQuery.instructions
							: result.chart?.instructions,
				};
			}

			if (msg.chart?.result) {
				const chartResult = msg.chart.result;
				const vegaConfig = isRecord(chartResult)
					? chartResult.vegaConfig
					: undefined;

				const mark = isRecord(vegaConfig) ? vegaConfig.mark : undefined;
				const markType = isRecord(mark)
					? mark.type
					: typeof mark === "string"
						? mark
						: undefined;

				const encoding = isRecord(vegaConfig) ? vegaConfig.encoding : undefined;
				const thetaField =
					isRecord(encoding) && isRecord(encoding.theta)
						? encoding.theta.field
						: undefined;
				const colorField =
					isRecord(encoding) && isRecord(encoding.color)
						? encoding.color.field
						: undefined;
				const xField =
					isRecord(encoding) && isRecord(encoding.x)
						? encoding.x.field
						: undefined;
				const yField =
					isRecord(encoding) && isRecord(encoding.y)
						? encoding.y.field
						: undefined;

				const chartValues =
					isRecord(vegaConfig) &&
					isRecord(vegaConfig.data) &&
					Array.isArray(vegaConfig.data.values)
						? vegaConfig.data.values
						: undefined;

				const type =
					markType === "arc"
						? "pie"
						: markType === "line"
							? "line"
							: markType === "bar"
								? "bar"
								: undefined;

				result.chart = {
					...result.chart,
					type,
					title:
						isRecord(vegaConfig) && typeof vegaConfig.title === "string"
							? vegaConfig.title
							: result.chart?.title,
					vegaConfig,
					data: chartValues,
					xField: typeof xField === "string" ? xField : result.chart?.xField,
					yField: typeof yField === "string" ? yField : result.chart?.yField,
					categoryField:
						typeof colorField === "string"
							? colorField
							: result.chart?.categoryField,
					valueField:
						typeof thetaField === "string"
							? thetaField
							: result.chart?.valueField,
				};
			}
		}
	}

	// If we only got text, return just that
	if (result.text && !result.sql && !result.data) {
		return result.text;
	}

	return result;
}
