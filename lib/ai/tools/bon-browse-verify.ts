/**
 * BON (Board of Nursing) Browser Verification Tool
 *
 * Browser automation tool using Playwright + Browserbase.
 * Verifies nursing professionals against the Texas Board of Nursing
 * licence lookup portal. Extracts licence status, type, and compact status.
 *
 * Uses Browserbase solveCaptchas to handle CAPTCHA automatically.
 */

import { tool } from "ai";
import { z } from "zod";
import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";
import type { BrowserAction } from "@/lib/ai/agents/types";

const BON_LOOKUP_URL = "https://txbn.boardsofnursing.org/licenselookup";

/** XPath selectors for TX BON licence lookup */
const SELECTORS = {
	/** "Licence Number" tab toggle */
	licenceNumberTab: "xpath=/html/body/div[2]/form/div/div/div[1]/ul/li[2]/a",
	/** Licence number text input */
	licenceNumberInput:
		"xpath=/html/body/div[2]/form/div/div/div[3]/div[2]/div/div[1]/div/input",
	/** Licence type select dropdown */
	licenceTypeSelect:
		"xpath=/html/body/div[2]/form/div/div/div[3]/div[2]/div/div[2]/div/select",
	/** CAPTCHA area (wait for it to clear) */
	captchaArea: "xpath=/html/body/div[2]/form/div/div/div[3]/div[4]",
	/** Search button */
	searchButton: "xpath=/html/body/div[2]/form/div/div/div[3]/div[5]/button",
	/** "View Report" link in results */
	viewReportLink:
		"xpath=/html/body/div[2]/div[2]/div/div/div/div/div/div[1]/div/a",
};

/** Single licence card extracted from BON report */
export interface BONLicenceCard {
	nameOnLicence: string;
	licenceType: string;
	licenceNumber: string;
	licenceStatus: string;
	originalIssueDate: string;
	currentIssueDate: string;
	currentExpirationDate: string;
	compactStatus: string;
}

/** Structured result from BON verification */
export interface BONVerificationResult {
	ncsbnId: string;
	licences: BONLicenceCard[];
	verified: boolean;
}

/**
 * Extract licence details from the BON report page.
 * The report uses Bootstrap cards: .card.mb-3 per licence.
 * Each card has rows of .col-md-4 strong + span label:value pairs.
 */
async function extractReportDetails(
	page: import("playwright-core").Page,
): Promise<BONVerificationResult> {
	const result: BONVerificationResult = {
		ncsbnId: "",
		licences: [],
		verified: false,
	};

	// Extract NCSBN ID from report header
	try {
		const headerText = await page.locator("body").textContent();
		if (headerText) {
			const ncsbnMatch = headerText.match(/NCSBN\s*ID[:\s]*(\d+)/i);
			if (ncsbnMatch) {
				result.ncsbnId = ncsbnMatch[1];
			}
		}
	} catch {
		console.log("[bonBrowseVerify] Could not extract NCSBN ID");
	}

	// Extract licence cards
	try {
		const cards = page.locator(".card-body > .card.mb-3");
		const cardCount = await cards.count();
		console.log(`[bonBrowseVerify] Found ${cardCount} licence cards`);

		for (let c = 0; c < cardCount; c++) {
			const card = cards.nth(c);
			const licence: BONLicenceCard = {
				nameOnLicence: "",
				licenceType: "",
				licenceNumber: "",
				licenceStatus: "",
				originalIssueDate: "",
				currentIssueDate: "",
				currentExpirationDate: "",
				compactStatus: "",
			};

			// Each card has rows with .col-md-4 containing strong (label) + span (value)
			const rows = card.locator(".row");
			const rowCount = await rows.count();

			for (let r = 0; r < rowCount; r++) {
				const row = rows.nth(r);
				const cols = row.locator(".col-md-4");
				const colCount = await cols.count();

				for (let col = 0; col < colCount; col++) {
					const colEl = cols.nth(col);
					const strongEl = colEl.locator("strong");
					if ((await strongEl.count()) === 0) continue;

					const label = await strongEl.textContent();
					if (!label) continue;

					const spanEl = colEl.locator("span");
					const value =
						(await spanEl.count()) > 0 ? await spanEl.textContent() : null;
					const cleanLabel = label.trim().toLowerCase().replace(/:$/, "");
					const cleanValue = value?.trim() || "";

					console.log(
						`[bonBrowseVerify] Card ${c}: "${cleanLabel}" = "${cleanValue}"`,
					);

					if (cleanLabel.includes("name on license")) {
						licence.nameOnLicence = cleanValue;
					} else if (
						cleanLabel.includes("license type") ||
						cleanLabel.includes("licence type")
					) {
						licence.licenceType = cleanValue;
					} else if (
						cleanLabel.includes("license number") ||
						cleanLabel.includes("licence number")
					) {
						licence.licenceNumber = cleanValue;
					} else if (
						cleanLabel.includes("license status") ||
						cleanLabel.includes("licence status")
					) {
						licence.licenceStatus = cleanValue;
					} else if (cleanLabel.includes("original issue")) {
						licence.originalIssueDate = cleanValue;
					} else if (cleanLabel.includes("current issue")) {
						licence.currentIssueDate = cleanValue;
					} else if (cleanLabel.includes("expiration")) {
						licence.currentExpirationDate = cleanValue;
					} else if (cleanLabel.includes("compact")) {
						licence.compactStatus = cleanValue;
					}
				}
			}

			result.licences.push(licence);
		}
	} catch (err) {
		console.log("[bonBrowseVerify] Error extracting licence cards:", err);
	}

	// Determine verification — at least one licence is Current
	result.verified = result.licences.some(
		(l) =>
			l.licenceStatus.toLowerCase().includes("current") ||
			l.licenceStatus.toLowerCase().includes("active"),
	);

	return result;
}

/** Callback for streaming browser actions */
export type BrowserActionCallback = (action: BrowserAction) => void;

/**
 * Create a BON verification tool instance.
 * Accepts an optional onAction callback for real-time action streaming.
 */
export function createBonBrowseVerify(onAction?: BrowserActionCallback) {
	return tool({
		description: `Navigates to the Texas Board of Nursing licence lookup, enters a licence number, handles CAPTCHA, and extracts structured verification data.
Used for verifying nursing professionals against the TX BON official register.

When to use:
- Verifying a nurse's TX BON licence
- Checking licence status (Current, Expired, Suspended)
- Checking compact/multistate status
- Cross-referencing licence details with candidate profile`,

		inputSchema: z.object({
			licenceNumber: z
				.string()
				.min(1)
				.describe("TX BON licence number (e.g. 801653)"),
			url: z
				.string()
				.url()
				.optional()
				.default(BON_LOOKUP_URL)
				.describe("URL of the BON licence lookup (defaults to TX BON)"),
		}),

		execute: async ({
			licenceNumber,
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
						allLicences: BONLicenceCard[];
						liveViewUrl: string;
						browserSessionId: string;
						verified: boolean;
					};
			  }
			| { error: string }
		> => {
			console.log("[bonBrowseVerify] Verifying licence:", licenceNumber);

			const apiKey = process.env.BROWSERBASE_API_KEY;
			const projectId = process.env.BROWSERBASE_PROJECT_ID;

			if (!apiKey || !projectId) {
				return {
					error:
						"Browserbase credentials not configured. Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID.",
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
				// 1. Create Browserbase session with CAPTCHA solving enabled
				bb = new Browserbase({ apiKey });
				const session = await bb.sessions.create({
					projectId,
					browserSettings: {
						recordSession: true,
						solveCaptchas: true,
					},
				});
				const sessionId = session.id;
				bbSessionId = sessionId;

				// 2. Get debug URL for live view
				const debugInfo = await bb.sessions.debug(sessionId);
				const liveViewUrl = debugInfo.debuggerFullscreenUrl;
				console.log("[bonBrowseVerify] Live view URL:", liveViewUrl);

				emit("browser-ready", "Browser session initialised", liveViewUrl);

				// 3. Connect Playwright via CDP
				browser = await chromium.connectOverCDP(session.connectUrl);
				const defaultContext = browser.contexts()[0];
				const page =
					defaultContext.pages()[0] || (await defaultContext.newPage());

				// 4. Navigate to BON licence lookup
				const portalUrl = url || BON_LOOKUP_URL;
				console.log("[bonBrowseVerify] Navigating to:", portalUrl);
				await page.goto(portalUrl, {
					waitUntil: "domcontentloaded",
					timeout: 30000,
				});
				console.log("[bonBrowseVerify] Page loaded");
				emit(
					"navigate",
					"Navigated to TX Board of Nursing licence lookup",
					portalUrl,
				);

				// 5. Wait for CAPTCHA to appear, then be solved by Browserbase
				console.log("[bonBrowseVerify] Waiting for CAPTCHA to appear...");
				emit("extract", "Waiting for CAPTCHA to be solved", "captcha");

				const captchaSelector =
					'iframe[src*="recaptcha"], iframe[title*="reCAPTCHA"], .g-recaptcha, [data-sitekey]';

				// Phase 1: Wait for CAPTCHA to appear in the DOM (can take 20-30s)
				try {
					await page
						.locator(captchaSelector)
						.first()
						.waitFor({ state: "visible", timeout: 35000 });
					console.log("[bonBrowseVerify] CAPTCHA appeared");
				} catch {
					console.log("[bonBrowseVerify] CAPTCHA never appeared, continuing");
				}

				// Phase 2: Wait for CAPTCHA to be solved and disappear
				const captchaStart = Date.now();
				const captchaTimeout = 45000;
				while (Date.now() - captchaStart < captchaTimeout) {
					const hasCaptcha = await page
						.locator(captchaSelector)
						.first()
						.isVisible()
						.catch(() => false);
					if (!hasCaptcha) {
						console.log("[bonBrowseVerify] CAPTCHA cleared");
						break;
					}
					await page.waitForTimeout(2000);
				}
				await page.waitForTimeout(1000);

				// 6. Click the "Licence Number" search tab
				console.log("[bonBrowseVerify] Clicking licence number tab...");
				const licTab = page.locator(SELECTORS.licenceNumberTab);
				await licTab.waitFor({ state: "visible", timeout: 15000 });
				await licTab.click();
				emit(
					"click",
					"Selected licence number search tab",
					"licence number tab",
				);
				await page.waitForTimeout(1000);

				// 7. Enter licence number
				console.log("[bonBrowseVerify] Entering licence number...");
				const licInput = page.locator(SELECTORS.licenceNumberInput);
				await licInput.waitFor({ state: "visible", timeout: 10000 });
				await licInput.fill(licenceNumber);
				emit(
					"type",
					`Entered licence number: ${licenceNumber}`,
					"licence number",
				);

				// 8. Select licence type — RN (value "2")
				console.log("[bonBrowseVerify] Selecting licence type: RN");
				const licSelect = page.locator(SELECTORS.licenceTypeSelect);
				await licSelect.waitFor({ state: "visible", timeout: 15000 });
				await licSelect.selectOption("2");
				emit("click", "Selected licence type: RN", "licence type");

				// 9. Click search
				console.log("[bonBrowseVerify] Clicking search...");
				const searchBtn = page.locator(SELECTORS.searchButton);
				await searchBtn.waitFor({ state: "visible", timeout: 10000 });
				await searchBtn.click();
				emit("click", "Submitted search", "search");

				// 11. Wait for results to appear
				console.log("[bonBrowseVerify] Waiting for results...");
				await page.waitForTimeout(5000);

				// 12. Check for results — look for the "View Report" link
				const viewReport = page.locator(SELECTORS.viewReportLink);
				const hasResults = await viewReport.isVisible().catch(() => false);

				if (!hasResults) {
					// Check if there are any results at all
					const pageText = await page.locator("body").textContent();
					if (
						pageText &&
						(pageText.toLowerCase().includes("no results") ||
							pageText.toLowerCase().includes("no records") ||
							pageText.toLowerCase().includes("not found"))
					) {
						emit("complete", "No matching licence found", "not found");
						return {
							error: `No BON licence found for licence number: ${licenceNumber}`,
						};
					}
					// May still be loading — wait longer and retry
					await page.waitForTimeout(5000);
					const retryVisible = await viewReport.isVisible().catch(() => false);
					if (!retryVisible) {
						emit("complete", "No results or page timeout", "timeout");
						return {
							error: `Could not find results for licence number: ${licenceNumber}. The CAPTCHA may not have been solved or the search returned no results.`,
						};
					}
				}

				// 13. Click "View Report"
				console.log("[bonBrowseVerify] Clicking View Report...");
				await viewReport.click();
				emit(
					"click",
					"Clicked View Report to see full licence details",
					"view report",
				);

				// 14. Wait for report page to load
				await page.waitForTimeout(4000);
				await page
					.locator(".card-body")
					.waitFor({ state: "visible", timeout: 30000 })
					.catch(() => {
						console.log("[bonBrowseVerify] card-body not found, continuing...");
					});

				// 15. Extract report details
				emit("extract", "Extracting licence details from report", "results");
				const parsed = await extractReportDetails(page);

				// Build flat fields from first (primary) licence
				const primary = parsed.licences[0];
				const fields: Record<string, string> = {};
				if (primary) {
					fields.nameOnLicence = primary.nameOnLicence;
					fields.licenceType = primary.licenceType;
					fields.licenceNumber = primary.licenceNumber;
					fields.licenceStatus = primary.licenceStatus;
					fields.originalIssueDate = primary.originalIssueDate;
					fields.currentIssueDate = primary.currentIssueDate;
					fields.expirationDate = primary.currentExpirationDate;
					fields.compactStatus = primary.compactStatus;
				}
				if (parsed.ncsbnId) {
					fields.ncsbnId = parsed.ncsbnId;
				}
				if (parsed.licences.length > 1) {
					fields.totalLicences = String(parsed.licences.length);
				}

				const licenceTypes = parsed.licences
					.map((l) => l.licenceType)
					.filter(Boolean)
					.join(", ");

				emit(
					"complete",
					`Verification complete: ${parsed.verified ? "Current licence found" : "Licence issues found"}`,
					`${licenceTypes || "Unknown"} — ${primary?.licenceStatus || "Unknown status"}`,
				);

				console.log("[bonBrowseVerify] SUCCESS - returning result");

				return {
					data: {
						result: {
							success: true,
							message: `BON licence ${parsed.verified ? "verified" : "has issues"}. Status: ${primary?.licenceStatus || "Unknown"}. Types: ${licenceTypes || "Unknown"}.`,
							verified: parsed.verified,
						},
						fields,
						allLicences: parsed.licences,
						liveViewUrl,
						browserSessionId: sessionId,
						verified: parsed.verified,
					},
				};
			} catch (error) {
				console.error("[bonBrowseVerify] CAUGHT ERROR:", error);

				// Clean up Playwright errors — strip the verbose call log
				let message = "Unknown error";
				if (error instanceof Error) {
					const firstLine = error.message.split("\n")[0].trim();
					if (firstLine.includes("Timeout")) {
						message =
							"The BON website took too long to respond. This is usually caused by the CAPTCHA not being solved in time. Please try again.";
					} else {
						message = firstLine;
					}
				}

				return { error: `BON verification failed: ${message}` };
			} finally {
				console.log("[bonBrowseVerify] Entering finally block");
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
						console.log("[bonBrowseVerify] Browser closed");
					} catch (err) {
						console.log(
							"[bonBrowseVerify] Browser close error (ignored):",
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
						console.log("[bonBrowseVerify] Session released");
					} catch (err) {
						console.log(
							"[bonBrowseVerify] Session release error (ignored):",
							err,
						);
					}
				}
				console.log("[bonBrowseVerify] Finally block complete");
			}
		},
	});
}

/** Default instance (no streaming) */
export const bonBrowseVerify = createBonBrowseVerify();
