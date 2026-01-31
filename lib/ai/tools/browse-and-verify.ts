/**
 * browse-and-verify Tool
 *
 * Browser automation tool using Playwright + Browserbase.
 * Hardcoded XPath steps for AHA certificate verification.
 * Streams action events per step via onAction callback.
 */

import { tool } from "ai";
import { z } from "zod";
import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";
import type { BrowserAction } from "@/lib/ai/skills/types";

/** XPath selectors for the AHA verification page */
const SELECTORS = {
	input:
		"xpath=/html/body/app-root/app-verify-certificate/div[2]/div/div/div[1]/div[2]/form/div[1]/input",
	submit:
		"xpath=/html/body/app-root/app-verify-certificate/div[2]/div/div/div[1]/div[2]/form/div[2]/button",
	results:
		"xpath=/html/body/app-root/app-verify-certificate/div[2]/div/div/div[1]/div[2]/div",
};

/** Known fields from the AHA verification results page */
const FIELD_PATTERNS = [
	"Program Name",
	"Certificate Name",
	"Issued to",
	"Claimed By",
	"eCard Valid Until",
	"RQI eCredential Valid Until",
] as const;

/** Parse raw text from the AHA results div into structured fields */
function parseResultFields(raw: string): Record<string, string> {
	const fields: Record<string, string> = {};
	if (!raw) return fields;

	// Check validity status (appears before first field label)
	const validityMatch = raw.match(/^(.+?)(?=Program Name\s*:)/);
	if (validityMatch) {
		const status = validityMatch[1].trim();
		if (status) fields["Status"] = status;
	}

	for (let i = 0; i < FIELD_PATTERNS.length; i++) {
		const label = FIELD_PATTERNS[i];
		const nextLabel = FIELD_PATTERNS[i + 1];
		// Match "Label : Value" up to the next label or end of useful content
		const endPattern = nextLabel
			? `(?=${nextLabel}\\s*:)`
			: "(?=Your personal data|Please see more|$)";
		const regex = new RegExp(`${label}\\s*:\\s*(.+?)\\s*${endPattern}`, "s");
		const match = raw.match(regex);
		if (match?.[1]) {
			fields[label] = match[1].trim();
		}
	}

	return fields;
}

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
				.default(
					"https://certificates.rqi1stop.com/certificates/us/verify_certificate",
				)
				.describe(
					"URL of the verification portal (defaults to AHA portal)",
				),
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
							actions: Array<{
								type: string;
								reasoning?: string;
								action?: string;
							}>;
						};
						fields: Record<string, string>;
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
					error: "Browserbase credentials not configured. Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID.",
				};
			}

			let browser: Awaited<
				ReturnType<typeof chromium.connectOverCDP>
			> | null = null;
			let actionIndex = 0;

			const emit = (
				type: string,
				reasoning: string,
				action?: string,
			) => {
				if (!onAction) return;
				onAction({
					index: actionIndex++,
					type,
					reasoning,
					action,
					timestamp: new Date().toISOString(),
				});
			};

			try {
				// 1. Create Browserbase session
				const bb = new Browserbase({ apiKey });
				const session = await bb.sessions.create({
					projectId,
					browserSettings: {
						recordSession: true,
					},
				});
				const sessionId = session.id;

				// 2. Get debug URL for live view
				const debugInfo = await bb.sessions.debug(sessionId);
				const liveViewUrl = debugInfo.debuggerFullscreenUrl;
				console.log("[browseAndVerify] Live view URL:", liveViewUrl);

				await emit(
					"browser-ready",
					"Browser session initialised",
					liveViewUrl,
				);

				// 3. Connect Playwright via CDP
				browser = await chromium.connectOverCDP(session.connectUrl);
				const defaultContext = browser.contexts()[0];
				const page = defaultContext.pages()[0] || (await defaultContext.newPage());

				// 4. Navigate to verification URL
				const verifyUrl =
					url ||
					"https://certificates.rqi1stop.com/certificates/us/verify_certificate";
				await page.goto(verifyUrl, { waitUntil: "networkidle" });
				emit("navigate", "Navigated to verification portal", verifyUrl);

				// 5. Fill eCard input
				const input = page.locator(SELECTORS.input);
				await input.waitFor({ state: "visible", timeout: 15000 });
				await input.fill(ecardCode);
				emit("type", `Entered eCard code: ${ecardCode}`, ecardCode);

				// 6. Click submit and wait for results
				const submitBtn = page.locator(SELECTORS.submit);
				await submitBtn.click();

				// Wait for results div to appear
				const resultsDiv = page.locator(SELECTORS.results);
				await resultsDiv.waitFor({ state: "visible", timeout: 15000 });
				await page.waitForTimeout(1000);
				emit("click", "Clicked submit and waiting for results", "submit");

				// 7. Extract result text
				const resultText = await resultsDiv.textContent();
				emit("extract", "Extracted verification results", resultText || "No results found");

				console.log(
					"[browseAndVerify] Result text:",
					resultText,
				);

				// 8. Parse into structured fields
				const fields = parseResultFields(resultText || "");
				console.log("[browseAndVerify] Parsed fields:", fields);

				// 9. Determine verified/not verified
				const messageLower = (resultText || "").toLowerCase();
				const negativeSignals = [
					"invalid",
					"not found",
					"not valid",
					"not verified",
					"error occurred",
					"verification failed",
					"expired",
					"no results",
					"could not",
					"unable to verify",
				];
				const positiveSignals = [
					"valid",
					"verified",
					"successfully",
					"active",
				];
				const hasNegative = negativeSignals.some((s) =>
					messageLower.includes(s),
				);
				const hasPositive = positiveSignals.some((s) =>
					messageLower.includes(s),
				);
				const verified = hasPositive && !hasNegative;

				// Build a readable summary from parsed fields
				const summary = Object.entries(fields)
					.map(([k, v]) => `${k}: ${v}`)
					.join("\n");

				return {
					data: {
						result: {
							success: true,
							message: summary || resultText || "No results text found",
							actions: [],
						},
						fields,
						liveViewUrl,
						browserSessionId: sessionId,
						verified,
					},
				};
			} catch (error) {
				console.error("[browseAndVerify] Error:", error);
				return {
					error: `Browser verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				};
			} finally {
				if (browser) {
					try {
						await browser.close();
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
