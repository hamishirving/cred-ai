/**
 * browse-and-verify Tool
 *
 * Browser automation tool using Stagehand CUA agent + Browserbase.
 * Gives the agent a single instruction to navigate, fill forms, and extract results.
 * Returns structured verification data + live view URL for real-time observation.
 *
 * Supports an onAction callback for streaming browser actions in real-time.
 */

import { tool } from "ai";
import { z } from "zod";
import { Stagehand } from "@browserbasehq/stagehand";
import Browserbase from "@browserbasehq/sdk";
import type { BrowserAction } from "@/lib/ai/skills/types";

/** Callback for streaming browser actions as they happen */
export type BrowserActionCallback = (action: BrowserAction) => void;

/**
 * Create a browseAndVerify tool instance.
 * Accepts an optional onAction callback for real-time action streaming.
 */
export function createBrowseAndVerify(onAction?: BrowserActionCallback) {
	return tool({
		description: `Navigates to a web verification portal, enters a certificate code, and extracts structured results.
Used for source verification against external portals like the AHA certificate verification site.

When to use:
- Verifying certificates against issuing authority portals
- Checking registration status on regulatory body websites
- Any verification that requires interacting with a web form`,

		inputSchema: z.object({
			ecardCode: z
				.string()
				.describe("The eCard code to verify against the AHA portal"),
			url: z
				.string()
				.url()
				.optional()
				.default("https://certificates.rqi1stop.com/certificates/us/verify_certificate")
				.describe("URL of the verification portal (defaults to AHA portal)"),
		}),

		execute: async ({
			ecardCode,
			url,
		}): Promise<
			| {
					data: {
						result: {
							success: boolean;
							message: string;
							actions: Array<{ type: string; reasoning?: string; action?: string }>;
						};
						liveViewUrl: string;
						browserSessionId: string;
						verified: boolean;
					};
			  }
			| { error: string }
		> => {
			console.log("[browseAndVerify] Verifying eCard code:", ecardCode);

			const apiKey = process.env.BROWSERBASE_API_KEY;
			const projectId = process.env.BROWSERBASE_PROJECT_ID;

			if (!apiKey || !projectId) {
				return {
					error:
						"Browserbase credentials not configured. Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID.",
				};
			}

			let stagehand: Stagehand | null = null;
			let actionIndex = 0;

			try {
				// 1. Init Stagehand — it creates the Browserbase session internally
				stagehand = new Stagehand({
					env: "BROWSERBASE",
					apiKey,
					projectId,
					experimental: true,
					model: {
						modelName: "claude-3-7-sonnet-latest",
						apiKey: process.env.ANTHROPIC_API_KEY,
					},
				});
				await stagehand.init();

				// 2. Get session ID and live view URL
				const sessionId = stagehand.browserbaseSessionID;
				let liveViewUrl = "";
				if (sessionId) {
					const bb = new Browserbase({ apiKey });
					const debugInfo = await bb.sessions.debug(sessionId);
					liveViewUrl = debugInfo.debuggerFullscreenUrl;
					console.log("[browseAndVerify] Live view URL:", liveViewUrl);
				}

				// Emit live view as first action
				if (onAction && liveViewUrl) {
					onAction({
						index: actionIndex++,
						type: "browser-ready",
						reasoning: "Browser session initialised",
						action: liveViewUrl,
						timestamp: new Date().toISOString(),
					});
				}

				// 3. Run CUA agent with a single instruction
				const verifyUrl = url || "https://certificates.rqi1stop.com/certificates/us/verify_certificate";

				const agent = stagehand.agent({
					model: {
						modelName: "anthropic/claude-sonnet-4-5-20250929",
						apiKey: process.env.ANTHROPIC_API_KEY,
					},
				});

				const result = await agent.execute({
					instruction: `Go to ${verifyUrl}. Find the certificate verification input field, type the eCard code "${ecardCode}", and click the verify/submit button. Wait for the results to load, then tell me what the verification result says — including validity status, certificate holder name, program name, expiry dates, and any error messages.`,
					maxSteps: 10,
					callbacks: {
						onStepFinish: async (event) => {
							if (!onAction) return;
							// Emit each tool call from this step as a browser action
							if (event.toolCalls) {
								for (const tc of event.toolCalls) {
									onAction({
										index: actionIndex++,
										type: tc.toolName || "action",
										reasoning: `Step finished: ${event.finishReason || "unknown"}`,
										action: typeof tc.input === "string"
											? tc.input
											: JSON.stringify(tc.input),
										timestamp: new Date().toISOString(),
									});
								}
							}
						},
					},
				});

				console.log("[browseAndVerify] Agent result:", result.message);

				// Determine if verified — check for negative signals first
				const messageLower = result.message.toLowerCase();
				const negativeSignals = [
					"invalid", "not found", "not valid", "not verified",
					"error occurred", "verification failed", "expired",
					"no results", "could not", "unable to verify",
				];
				const hasNegative = negativeSignals.some((s) => messageLower.includes(s));
				const positiveSignals = ["valid", "verified", "successfully", "active"];
				const hasPositive = positiveSignals.some((s) => messageLower.includes(s));
				const verified = result.success && hasPositive && !hasNegative;

				return {
					data: {
						result: {
							success: result.success,
							message: result.message,
							actions: (result.actions || []).map((a) => ({
								type: a.type,
								reasoning: a.reasoning,
								action: a.action,
							})),
						},
						liveViewUrl,
						browserSessionId: sessionId || "",
						verified,
					},
				};
			} catch (error) {
				console.error("[browseAndVerify] Error:", error);
				return {
					error: `Browser verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				};
			} finally {
				if (stagehand) {
					try {
						await stagehand.close();
					} catch {
						// Ignore cleanup errors
					}
				}
			}
		},
	});
}

/** Default instance (no streaming) — used when callback isn't needed */
export const browseAndVerify = createBrowseAndVerify();
