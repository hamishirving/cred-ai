import { tool } from "ai";
import { GoogleAuth } from "google-auth-library";
import { z } from "zod";

const BILLING_PROJECT =
  process.env.GEMINI_BILLING_PROJECT ?? "arched-proton-478514-s5";
const LOCATION = process.env.GEMINI_LOCATION ?? "europe-west2";
const AGENT_ID =
  process.env.GEMINI_AGENT_ID ?? "agent_55883a2d-c26d-42f9-8c67-5a675127dfcd";

const BASE_URL = "https://geminidataanalytics.googleapis.com/v1beta";

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
        res.statusText
      );

      const text = await res.text();
      console.log("[queryDataAgent] Response body:", text.slice(0, 1000));

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
    chart?: unknown;
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
      if (msg.chart?.result) {
        result.chart = msg.chart.result;
      }
    }
  }

  // If we only got text, return just that
  if (result.text && !result.sql && !result.data) {
    return result.text;
  }

  return result;
}

