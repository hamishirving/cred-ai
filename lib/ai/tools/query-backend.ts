import { tool } from "ai";
import { z } from "zod";

const BACKEND_URL =
  process.env.BACKEND_API_URL ??
  "https://arely-preconnubial-twangily.ngrok-free.dev";

export const queryBackend = tool({
  description: `Query the backend system for information about employees, organisations, compliance, and other business data. 
Use this tool when the user asks about:
- Finding employees by name, email, or organisation
- Organisation details
- Compliance status
- Any business data queries

Pass the user's question directly as the prompt.`,

  inputSchema: z.object({
    prompt: z
      .string()
      .describe("The user's question or query to send to the backend"),
  }),

  execute: async ({
    prompt,
  }): Promise<{ data: unknown } | { error: string }> => {
    const url = `${BACKEND_URL}/prompt`;
    console.log("[queryBackend] Request URL:", url);
    console.log("[queryBackend] Request body:", { prompt });

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          "ngrok-skip-browser-warning": "true",
        },
        body: prompt,
      });

      console.log(
        "[queryBackend] Response status:",
        res.status,
        res.statusText
      );

      const text = await res.text();
      console.log("[queryBackend] Response body:", text.slice(0, 1000));

      if (!res.ok) {
        return {
          error: `Backend returned ${res.status}: ${res.statusText}`,
        };
      }

      // Try parsing as JSON, fall back to plain text
      try {
        const data = JSON.parse(text);
        return { data };
      } catch {
        return { data: text };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[queryBackend] Fetch error:", error);
      return { error: `Failed to query backend: ${message}` };
    }
  },
});
