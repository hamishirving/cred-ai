/**
 * GDC (General Dental Council) Browser Verification Tool
 *
 * Browser automation tool using Playwright + Browserbase.
 * Verifies dental professionals against the GDC Online Register.
 * Extracts registration status, type, and any conditions.
 */

import { tool } from "ai";
import { z } from "zod";
import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";
import type { BrowserAction } from "@/lib/ai/agents/types";

const GDC_REGISTER_URL = "https://olr.gdc-uk.org/SearchRegister";

/** XPath selectors for GDC register */
const SELECTORS = {
	/** "Registration number" tab toggle */
	regNumberTab:
		"xpath=/html/body/div[3]/main/div[2]/div/div/div/div/div[2]/div[1]",
	/** Registration number text input */
	regNumberInput:
		"xpath=/html/body/div[3]/main/div[2]/div/div/div/div/div[2]/div[2]/div/form/div[1]/div/div/div/input",
	/** Search button */
	searchButton:
		"xpath=/html/body/div[3]/main/div[2]/div/div/div/div/div[2]/div[2]/div/form/div[2]/button",
	/** Results container */
	resultsContainer:
		"xpath=/html/body/div[3]/main/div[2]/div/div/div/div/div",
};

/** Structured result from GDC verification */
export interface GDCVerificationResult {
	registrant: {
		name: string;
		registrationNumber: string;
		registrationType: string;
		registrationStatus: string;
		firstRegistered: string;
		currentPeriod: string;
		qualifications: string;
	};
	conditions: string[];
	verified: boolean;
}

/**
 * Extract registration details from the GDC results card using CSS selectors.
 * The card uses Bootstrap rows: .col-md-4.font-weight-bold for labels,
 * sibling .col-md-6 or .col-md-4 for values. Name is in .card-header h2.
 */
async function extractRegistrationDetails(
	page: import("playwright-core").Page,
): Promise<GDCVerificationResult> {
	const result: GDCVerificationResult = {
		registrant: {
			name: "",
			registrationNumber: "",
			registrationType: "",
			registrationStatus: "",
			firstRegistered: "",
			currentPeriod: "",
			qualifications: "",
		},
		conditions: [],
		verified: false,
	};

	// Extract name from card header h2
	try {
		const nameText = await page.locator(".card-header h2").textContent();
		if (nameText) {
			result.registrant.name = nameText.trim();
		}
	} catch {
		console.log("[gdcBrowseVerify] Could not extract name from header");
	}

	// Extract label/value pairs from card body rows
	try {
		const rows = page.locator(".card-body > .row");
		const count = await rows.count();
		console.log(`[gdcBrowseVerify] Found ${count} data rows`);

		for (let i = 0; i < count; i++) {
			const row = rows.nth(i);

			// Skip rows without a label column (e.g. the "New Search" row uses col-md-12)
			const labelLocator = row.locator(".col-md-4.font-weight-bold");
			if ((await labelLocator.count()) === 0) continue;
			const label = await labelLocator.textContent();

			if (!label) continue;

			const valueLocator = row.locator(".col-md-6, .col-md-4:not(.font-weight-bold)").first();
			const value = (await valueLocator.count()) > 0
				? await valueLocator.textContent()
				: null;
			const cleanLabel = label.trim().toLowerCase().replace(/:$/, "");
			const cleanValue = value?.trim() || "";

			console.log(`[gdcBrowseVerify] "${cleanLabel}" = "${cleanValue}"`);

			if (cleanLabel.includes("registration number")) {
				result.registrant.registrationNumber = cleanValue;
			} else if (cleanLabel === "status") {
				result.registrant.registrationStatus = cleanValue;
			} else if (cleanLabel.includes("registrant type")) {
				result.registrant.registrationType = cleanValue;
			} else if (cleanLabel.includes("first registered")) {
				result.registrant.firstRegistered = cleanValue;
			} else if (cleanLabel.includes("current period")) {
				result.registrant.currentPeriod = cleanValue;
			} else if (cleanLabel.includes("qualification")) {
				result.registrant.qualifications = cleanValue;
			} else if (
				cleanLabel.includes("condition") ||
				cleanLabel.includes("restriction") ||
				cleanLabel.includes("undertaking")
			) {
				if (cleanValue && !cleanValue.toLowerCase().includes("none")) {
					result.conditions.push(cleanValue);
				}
			}
		}
	} catch (err) {
		console.log("[gdcBrowseVerify] Error extracting rows:", err);
	}

	// Determine verification status
	const status = result.registrant.registrationStatus.toLowerCase();
	result.verified = status.includes("registered") || status.includes("current") || status.includes("active");

	return result;
}

/** Callback for streaming browser actions */
export type BrowserActionCallback = (action: BrowserAction) => void;

/**
 * Create a GDC verification tool instance.
 * Accepts an optional onAction callback for real-time action streaming.
 */
export function createGdcBrowseVerify(onAction?: BrowserActionCallback) {
	return tool({
		description: `Navigates to the GDC Online Register, enters a registration number, and extracts structured verification data.
Used for verifying UK dental professionals against the General Dental Council official register.

When to use:
- Verifying a dentist or dental care professional's GDC registration
- Checking registration status (current, suspended, removed)
- Checking for conditions or restrictions on practice
- Cross-referencing registration details with uploaded documents`,

		inputSchema: z.object({
			registrationNumber: z
				.string()
				.min(1)
				.describe("GDC registration number (e.g. 271882)"),
			url: z
				.string()
				.url()
				.optional()
				.default(GDC_REGISTER_URL)
				.describe("URL of the GDC register (defaults to GDC Online Register)"),
		}),

		execute: async ({
			registrationNumber,
			url,
		}): Promise<
			| {
					data: {
						result: {
							success: boolean;
							message: string;
							verified: boolean;
						};
						fields: Record<string, string>;
						liveViewUrl: string;
						browserSessionId: string;
						verified: boolean;
					};
			  }
			| { error: string }
		> => {
			console.log(
				"[gdcBrowseVerify] Verifying registration:",
				registrationNumber,
			);

			const apiKey = process.env.BROWSERBASE_API_KEY;
			const projectId = process.env.BROWSERBASE_PROJECT_ID;

			if (!apiKey || !projectId) {
				return {
					error: "Browserbase credentials not configured. Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID.",
				};
			}

			let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | null =
				null;
			let bb: Browserbase | null = null;
			let bbSessionId: string | null = null;
			let actionIndex = 0;

			const emit = (type: string, reasoning: string, action?: string) => {
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
				bb = new Browserbase({ apiKey });
				const session = await bb.sessions.create({
					projectId,
					browserSettings: {
						recordSession: true,
					},
				});
				const sessionId = session.id;
				bbSessionId = sessionId;

				// 2. Get debug URL for live view
				const debugInfo = await bb.sessions.debug(sessionId);
				const liveViewUrl = debugInfo.debuggerFullscreenUrl;
				console.log("[gdcBrowseVerify] Live view URL:", liveViewUrl);

				emit("browser-ready", "Browser session initialised", liveViewUrl);

				// 3. Connect Playwright via CDP
				browser = await chromium.connectOverCDP(session.connectUrl);
				const defaultContext = browser.contexts()[0];
				const page =
					defaultContext.pages()[0] || (await defaultContext.newPage());

				// 4. Navigate to GDC register (use domcontentloaded — networkidle hangs on GDC's persistent connections)
				const portalUrl = url || GDC_REGISTER_URL;
				console.log("[gdcBrowseVerify] Navigating to:", portalUrl);
				await page.goto(portalUrl, {
					waitUntil: "domcontentloaded",
					timeout: 30000,
				});
				console.log("[gdcBrowseVerify] Page loaded");
				emit("navigate", "Navigated to GDC Online Register", portalUrl);

				// 5. Handle cookie banner if present
				try {
					const cookieButton = page.locator(
						'button:has-text("Accept"), button:has-text("Accept all"), a:has-text("Accept")',
					);
					const cookieVisible = await cookieButton
						.first()
						.isVisible()
						.catch(() => false);
					if (cookieVisible) {
						await cookieButton.first().click();
						emit("click", "Dismissed cookie banner", "accept cookies");
						await page.waitForTimeout(500);
					}
				} catch {
					// Cookie banner might not be present
				}

				// 6. Click the "Registration number" search tab
				console.log(
					"[gdcBrowseVerify] Clicking registration number tab...",
				);
				const regTab = page.locator(SELECTORS.regNumberTab);
				await regTab.waitFor({ state: "visible", timeout: 15000 });
				await regTab.click();
				emit(
					"click",
					"Selected registration number search",
					"reg number tab",
				);
				await page.waitForTimeout(500);

				// 7. Enter registration number
				console.log("[gdcBrowseVerify] Entering registration number...");
				const regInput = page.locator(SELECTORS.regNumberInput);
				await regInput.waitFor({ state: "visible", timeout: 10000 });
				await regInput.fill(registrationNumber);
				emit(
					"type",
					`Entered registration number: ${registrationNumber}`,
					"registration number",
				);

				// 8. Click search
				console.log("[gdcBrowseVerify] Clicking search...");
				const searchBtn = page.locator(SELECTORS.searchButton);
				await searchBtn.click();
				emit("click", "Submitted search", "search");

				// 9. Wait for results card to appear (don't use networkidle — GDC site has persistent connections)
				console.log("[gdcBrowseVerify] Waiting for results card...");
				await page.locator(".card-body").waitFor({ state: "visible", timeout: 30000 });
				console.log("[gdcBrowseVerify] Results card visible");

				// 10. Check for "no results" / no card present
				const hasCard = await page.locator(".card-header h2").isVisible().catch(() => false);
				if (!hasCard) {
					const pageText = await page.locator("body").textContent();
					if (
						pageText &&
						(pageText.toLowerCase().includes("no results found") ||
							pageText.toLowerCase().includes("no records found") ||
							pageText.toLowerCase().includes("does not match"))
					) {
						emit("complete", "No matching registrant found", "not found");
						return {
							error: `No GDC registrant found for registration number: ${registrationNumber}`,
						};
					}
				}

				// 11. Extract results from the Bootstrap card structure
				emit("extract", "Extracting registration details from results card", "results");

				const parsed = await extractRegistrationDetails(page);

				// Fallback: use input reg number if not extracted
				if (!parsed.registrant.registrationNumber) {
					parsed.registrant.registrationNumber = registrationNumber;
				}

				emit(
					"complete",
					`Verification complete: ${parsed.verified ? "Currently registered" : "Registration issues found"}`,
					`${parsed.registrant.registrationType || "Unknown type"} — ${parsed.registrant.registrationStatus || "Unknown status"}`,
				);

				console.log("[gdcBrowseVerify] SUCCESS - returning result");

				return {
					data: {
						result: {
							success: true,
							message: `GDC registration ${parsed.verified ? "verified" : "has issues"}. Status: ${parsed.registrant.registrationStatus}. Type: ${parsed.registrant.registrationType}.`,
							verified: parsed.verified,
						},
						fields: {
							name: parsed.registrant.name,
							registrationNumber: parsed.registrant.registrationNumber,
							registrationType: parsed.registrant.registrationType,
							registrationStatus: parsed.registrant.registrationStatus,
							firstRegistered: parsed.registrant.firstRegistered,
							currentPeriod: parsed.registrant.currentPeriod,
							qualifications: parsed.registrant.qualifications,
							conditions: parsed.conditions.join("; ") || "None",
						},
						liveViewUrl,
						browserSessionId: sessionId,
						verified: parsed.verified,
					},
				};
			} catch (error) {
				console.error("[gdcBrowseVerify] CAUGHT ERROR:", error);
				return {
					error: `GDC verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				};
			} finally {
				console.log("[gdcBrowseVerify] Entering finally block");
				if (browser) {
					try {
						await Promise.race([
							browser.close(),
							new Promise((_, reject) =>
								setTimeout(
									() => reject(new Error("Browser close timeout")),
									5000,
								),
							),
						]);
						console.log("[gdcBrowseVerify] Browser closed");
					} catch (err) {
						console.log(
							"[gdcBrowseVerify] Browser close error (ignored):",
							err,
						);
					}
				}
				// Release the Browserbase session so the recording is finalised
				if (bb && bbSessionId && projectId) {
					try {
						await bb.sessions.update(bbSessionId, {
							projectId,
							status: "REQUEST_RELEASE",
						});
						console.log("[gdcBrowseVerify] Session released");
					} catch (err) {
						console.log(
							"[gdcBrowseVerify] Session release error (ignored):",
							err,
						);
					}
				}
				console.log("[gdcBrowseVerify] Finally block complete");
			}
		},
	});
}

/** Default instance (no streaming) */
export const gdcBrowseVerify = createGdcBrowseVerify();
