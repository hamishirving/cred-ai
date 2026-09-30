/**
 * DVLA Driving Licence Browser Verification Tool
 *
 * Browser automation tool using Playwright + Browserbase.
 * Verifies UK driving licences against GOV.UK View Driving Licence portal.
 * Extracts data from multiple tabs: Your details, Vehicles, Penalties.
 */

import { tool } from "ai";
import { z } from "zod";
import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";
import type { BrowserAction } from "@/lib/ai/agents/types";
import { captureAndUploadScreenshot } from "@/lib/ai/tools/screenshot-uploader";

/** XPath selectors for DVLA input form */
const INPUT_SELECTORS = {
	licenceNumber: "xpath=/html/body/main/div/div/div[2]/form/div[1]/div/input",
	niNumber: "xpath=/html/body/main/div/div/div[2]/form/div[2]/div/input",
	postcode: "xpath=/html/body/main/div/div/div[2]/form/div[3]/div/input",
	checkbox: "xpath=/html/body/main/div/div/div[2]/form/div[5]/div[2]/div/div/div/input[2]",
	submit: "xpath=/html/body/main/div/div/div[2]/form/div[6]/button",
};

/** Tab navigation selectors */
const TAB_SELECTORS = {
	vehiclesTab: "xpath=/html/body/main/div/div[2]/ul/li[2]/a",
	penaltiesTab: "xpath=/html/body/main/div/div[2]/ul/li[3]/a",
};

/** Result extraction selectors */
const RESULT_SELECTORS = {
	// "Your details" tab (default landing page)
	driverSummary: "xpath=/html/body/main/div/div[2]/div[1]/div/div/dl[1]/div[1]",
	licenceDetailsSummary: "xpath=/html/body/main/div/div[2]/div[1]/div/div/dl[2]",
	// "Vehicles you can drive" tab
	vehiclesWrapper: "xpath=/html/body/main/div/div[2]/div[2]/div[1]/div/div",
	showAllSectionsBtn: "xpath=/html/body/main/div/div[2]/div[2]/div[1]/div/div/div[1]/button",
};

/** Structured result from DVLA verification */
export interface DVLAVerificationResult {
	driver: {
		fullName: string;
		dateOfBirth: string;
		address: string;
		sex: string;
	};
	licence: {
		status: string; // "full" | "provisional" | "disqualified" | "revoked"
		validFrom: string;
		validTo: string;
		licenceNumber: string;
		issueNumber: string;
	};
	entitlements: Array<{
		category: string; // "B", "C", "C+E", etc.
		type: string; // "Full" | "Provisional"
		validFrom?: string;
		validTo?: string;
		restrictions?: string[];
	}>;
	endorsements: Array<{
		offenceCode: string; // "SP30", "DR10", etc.
		description: string;
		offenceDate: string;
		penaltyPoints: number;
		expiryDate: string;
	}>;
	verified: boolean;
	hasPenalties: boolean;
	totalPoints: number;
}

/** Extract key-value pairs from GOV.UK summary list (dl/dt/dd structure) */
async function extractSummaryListData(
	page: import("playwright-core").Page,
	containerSelector?: string
): Promise<Record<string, string>> {
	const data: Record<string, string> = {};

	try {
		// GOV.UK uses .govuk-summary-list with dt/dd pairs
		const baseSelector = containerSelector ? `${containerSelector} ` : "";
		const rows = page.locator(`${baseSelector}.govuk-summary-list__row, ${baseSelector}dl > div`);
		const count = await rows.count();

		console.log(`[dvlaBrowseVerify] Found ${count} summary list rows`);

		for (let i = 0; i < count; i++) {
			const row = rows.nth(i);
			const key = await row.locator("dt, .govuk-summary-list__key").first().textContent().catch(() => null);
			const value = await row.locator("dd, .govuk-summary-list__value").first().textContent().catch(() => null);

			if (key && value) {
				const cleanKey = key.trim().toLowerCase();
				const cleanValue = value.trim();
				data[cleanKey] = cleanValue;
				console.log(`[dvlaBrowseVerify] Extracted: "${cleanKey}" = "${cleanValue}"`);
			}
		}
	} catch (err) {
		console.log("[dvlaBrowseVerify] Error extracting summary list:", err);
	}

	return data;
}

/** Parse driver details from extracted data */
function parseDriverDetails(data: Record<string, string>): DVLAVerificationResult["driver"] {
	const driver = {
		fullName: "",
		dateOfBirth: "",
		address: "",
		sex: "",
	};

	for (const [key, value] of Object.entries(data)) {
		if (key.includes("name") && !key.includes("issue")) {
			driver.fullName = value;
		} else if (key.includes("date of birth") || key.includes("born")) {
			driver.dateOfBirth = value;
		} else if (key.includes("address")) {
			driver.address = value;
		} else if (key.includes("sex") || key.includes("gender")) {
			driver.sex = value;
		}
	}

	return driver;
}

/** Parse licence details from extracted data */
function parseLicenceDetails(data: Record<string, string>): DVLAVerificationResult["licence"] {
	const licence = {
		status: "full", // Default to full if on the page (means licence is valid)
		validFrom: "",
		validTo: "",
		licenceNumber: "",
		issueNumber: "",
	};

	for (const [key, value] of Object.entries(data)) {
		if (key.includes("status")) {
			licence.status = value.toLowerCase();
		} else if (key.includes("valid from") || key.includes("from")) {
			licence.validFrom = value;
		} else if (key.includes("valid to") || key.includes("expir") || key.includes("until")) {
			licence.validTo = value;
		} else if (key.includes("licence number") || key.includes("driving licence number")) {
			licence.licenceNumber = value;
		} else if (key.includes("issue number")) {
			licence.issueNumber = value;
		}
	}

	return licence;
}

/** Parse vehicle entitlements from the "Vehicles you can drive" tab */
function parseEntitlements(text: string): DVLAVerificationResult["entitlements"] {
	const entitlements: DVLAVerificationResult["entitlements"] = [];

	// Split by category codes (A, AM, B, BE, C, CE, etc.)
	const categoryPattern = /\b([A-Z]{1,2}[1-9]?[+]?[E]?)\b/g;
	const sections = text.split(/(?=\b[A-Z]{1,2}[1-9]?[+]?[E]?\s)/);

	for (const section of sections) {
		const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
		if (lines.length === 0) continue;

		// First line should be the category
		const categoryMatch = lines[0].match(categoryPattern);
		if (!categoryMatch) continue;

		const category = categoryMatch[0];
		const entitlement: DVLAVerificationResult["entitlements"][0] = {
			category,
			type: "Full",
		};

		const sectionText = lines.join(" ").toLowerCase();

		// Determine if full or provisional
		if (sectionText.includes("provisional")) {
			entitlement.type = "Provisional";
		}

		// Extract dates
		const datePattern = /(\d{1,2}[\s/-]\w+[\s/-]\d{2,4})/g;
		const dates = sectionText.match(datePattern) || [];
		if (dates.length >= 1) {
			entitlement.validFrom = dates[0];
		}
		if (dates.length >= 2) {
			entitlement.validTo = dates[1];
		}

		// Extract restrictions (codes like 01, 78, etc.)
		const restrictionPattern = /\b(\d{2})\b/g;
		const restrictions = sectionText.match(restrictionPattern);
		if (restrictions) {
			entitlement.restrictions = [...new Set(restrictions)];
		}

		entitlements.push(entitlement);
	}

	return entitlements;
}

/** Parse penalties from the "Penalties and disqualifications" tab */
function parsePenalties(text: string): {
	endorsements: DVLAVerificationResult["endorsements"];
	totalPoints: number;
} {
	const endorsements: DVLAVerificationResult["endorsements"] = [];
	let totalPoints = 0;

	// Check for "no penalty points" message
	if (text.toLowerCase().includes("no penalty points") ||
		text.toLowerCase().includes("no endorsements") ||
		text.toLowerCase().includes("you have no")) {
		return { endorsements, totalPoints: 0 };
	}

	// Split by offence codes (SP30, DR10, etc.)
	const offencePattern = /\b([A-Z]{2}\d{2})\b/g;
	const offenceCodes = text.match(offencePattern) || [];

	// Parse each offence section
	const sections = text.split(/(?=\b[A-Z]{2}\d{2}\b)/);

	for (const section of sections) {
		const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
		if (lines.length === 0) continue;

		const codeMatch = lines[0].match(offencePattern);
		if (!codeMatch) continue;

		const offenceCode = codeMatch[0];
		const endorsement: DVLAVerificationResult["endorsements"][0] = {
			offenceCode,
			description: "",
			offenceDate: "",
			penaltyPoints: 0,
			expiryDate: "",
		};

		const sectionText = lines.join(" ");

		// Extract penalty points
		const pointsMatch = sectionText.match(/(\d+)\s*(?:points?|penalty points)/i);
		if (pointsMatch) {
			endorsement.penaltyPoints = parseInt(pointsMatch[1], 10);
			totalPoints += endorsement.penaltyPoints;
		}

		// Extract dates
		const datePattern = /(\d{1,2}[\s/-]\w+[\s/-]\d{2,4})/g;
		const dates = sectionText.match(datePattern) || [];
		if (dates[0]) {
			endorsement.offenceDate = dates[0];
		}
		if (dates[1]) {
			endorsement.expiryDate = dates[1];
		}

		// Description is usually after the code
		const descStart = lines[0].indexOf(offenceCode) + offenceCode.length;
		const descText = lines[0].slice(descStart).trim();
		if (descText) {
			endorsement.description = descText;
		} else if (lines.length > 1) {
			endorsement.description = lines[1];
		}

		endorsements.push(endorsement);
	}

	return { endorsements, totalPoints };
}

/** Callback for streaming browser actions */
export type BrowserActionCallback = (action: BrowserAction) => void;

export type DvlaBrowseVerifyContext = {
	onAction?: BrowserActionCallback;
	agentId?: string;
	executionId?: string;
	organisationId?: string;
	executionInput?: Record<string, unknown>;
};

function readString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Create a DVLA verification tool instance.
 * Accepts an optional context for real-time action streaming with screenshots.
 */
export function createDvlaBrowseVerify(context?: DvlaBrowseVerifyContext) {
	return tool({
		description: `Navigates to the GOV.UK View Driving Licence portal, enters licence credentials, and extracts structured verification data.
Used for verifying UK driving licences against the DVLA official portal.

When to use:
- Verifying a candidate's UK driving licence authenticity
- Checking driving entitlements and categories
- Checking for penalty points or disqualifications
- Cross-referencing licence details with uploaded documents`,

		inputSchema: z.object({
			licenceNumber: z
				.string()
				.min(1)
				.describe("16-character DVLA driving licence number"),
			niNumber: z
				.string()
				.min(1)
				.describe("National Insurance number (format: AB 12 34 56 C)"),
			postcode: z
				.string()
				.min(1)
				.describe("Postcode registered with DVLA"),
			url: z
				.string()
				.url()
				.optional()
				.default("https://www.viewdrivingrecord.service.gov.uk/driving-record/licence-number")
				.describe("URL of the DVLA portal (defaults to GOV.UK portal)"),
		}),

		execute: async (
			{ licenceNumber, niNumber, postcode, url },
			{ abortSignal },
		): Promise<
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
						screenshotPaths: string[];
					};
			  }
			| { error: string }
		> => {
			// Strip spaces from NI number - DVLA requires exactly 9 chars with no spaces
			const cleanNiNumber = niNumber.replace(/\s/g, "");
			console.log("[dvlaBrowseVerify] Verifying licence:", licenceNumber);

			const apiKey = process.env.BROWSERBASE_API_KEY;
			const projectId = process.env.BROWSERBASE_PROJECT_ID;

			if (!apiKey || !projectId) {
				return {
					error: "Browserbase credentials not configured. Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID.",
				};
			}

			let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | null = null;
			let bb: Browserbase | null = null;
			let bbSessionId: string | null = null;
			let actionIndex = 0;
			let page: import("playwright-core").Page | null = null;

			// The SDK waits for running tools before it can abort the run, so on
			// timeout close the browser to make any in-flight Playwright call reject
			const closeOnAbort = () => {
				void browser?.close().catch(() => {});
			};
			abortSignal?.addEventListener("abort", closeOnAbort, { once: true });
			const screenshotPaths: string[] = [];
			const organisationId =
				readString(context?.executionInput?.organisationId) ||
				context?.organisationId;
			const profileId = readString(context?.executionInput?.profileId);

			// Screenshots only when the page visibly changed, to stay inside the route's time budget
			const emit = async (
				type: string,
				reasoning: string,
				action?: string,
				{ screenshot = true }: { screenshot?: boolean } = {},
			) => {
				const nextIndex = actionIndex++;
				let screenshotPath: string | undefined;
				let screenshotUrl: string | undefined;

				if (page && screenshot) {
					const captured = await captureAndUploadScreenshot({
						page,
						agentId: context?.agentId,
						executionId: context?.executionId,
						actionIndex: nextIndex,
						organisationId,
						profileId,
					});
					screenshotPath = captured.screenshotPath;
					screenshotUrl = captured.screenshotUrl;
					if (screenshotPath) {
						screenshotPaths.push(screenshotPath);
					}
				}

				if (!context?.onAction) return;

				context.onAction({
					index: nextIndex,
					type,
					reasoning,
					action,
					screenshotPath,
					screenshotUrl,
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
				console.log("[dvlaBrowseVerify] Live view URL:", liveViewUrl);

				await emit("browser-ready", "Browser session initialised", liveViewUrl);

				// 3. Connect Playwright via CDP
				browser = await chromium.connectOverCDP(session.connectUrl);
				const defaultContext = browser.contexts()[0];
				page = defaultContext.pages()[0] || (await defaultContext.newPage());

				// 4. Navigate to DVLA portal
				const portalUrl = url || "https://www.viewdrivingrecord.service.gov.uk/driving-record/licence-number";
				console.log("[dvlaBrowseVerify] Navigating to:", portalUrl);
				await page.goto(portalUrl, { waitUntil: "networkidle", timeout: 30000 });
				console.log("[dvlaBrowseVerify] Page loaded");
				await emit("navigate", "Navigated to DVLA portal", portalUrl);

				// 5. Handle cookie banner if present
				try {
					const cookieButton = page.locator('button:has-text("Accept"), button:has-text("Accept all")');
					const cookieVisible = await cookieButton.isVisible().catch(() => false);
					if (cookieVisible) {
						await cookieButton.click();
						await page.waitForTimeout(500);
						await emit("click", "Dismissed cookie banner", "accept cookies", { screenshot: false });
					}
				} catch {
					// Cookie banner might not be present
				}

				// 6. Fill licence number
				console.log("[dvlaBrowseVerify] Looking for licence input...");
				const licenceInput = page.locator(INPUT_SELECTORS.licenceNumber);
				await licenceInput.waitFor({ state: "visible", timeout: 15000 });
				console.log("[dvlaBrowseVerify] Found licence input, filling...");
				await licenceInput.fill(licenceNumber);
				await emit("type", `Entered licence number: ${licenceNumber.slice(0, 4)}****`, "licence number", { screenshot: false });

				// 7. Fill NI number (cleaned of spaces)
				console.log("[dvlaBrowseVerify] Filling NI number...");
				const niInput = page.locator(INPUT_SELECTORS.niNumber);
				await niInput.fill(cleanNiNumber);
				await emit("type", `Entered NI number: ${cleanNiNumber.slice(0, 2)}****`, "NI number", { screenshot: false });

				// 8. Fill postcode
				console.log("[dvlaBrowseVerify] Filling postcode...");
				const postcodeInput = page.locator(INPUT_SELECTORS.postcode);
				await postcodeInput.fill(postcode);
				await emit("type", `Entered postcode: ${postcode}`, "postcode", { screenshot: false });

				// 9. Check consent checkbox
				console.log("[dvlaBrowseVerify] Looking for checkbox...");
				const checkbox = page.locator(INPUT_SELECTORS.checkbox);
				const checkboxVisible = await checkbox.isVisible().catch(() => false);
				console.log("[dvlaBrowseVerify] Checkbox visible:", checkboxVisible);
				if (checkboxVisible) {
					await checkbox.check();
					await emit("click", "Checked consent checkbox", "consent");
				}

				// 10. Click submit
				console.log("[dvlaBrowseVerify] Clicking submit...");
				const submitBtn = page.locator(INPUT_SELECTORS.submit);
				await submitBtn.click();
				console.log("[dvlaBrowseVerify] Submitted form");

				// Wait for results page to load
				console.log("[dvlaBrowseVerify] Waiting for results page...");
				await page.waitForLoadState("networkidle", { timeout: 30000 });
				await page.waitForTimeout(2000);
				console.log("[dvlaBrowseVerify] Results page loaded");
				await emit("click", "Submitted verification form", "submit");

				// Check for error messages
				// count() doesn't auto-wait; textContent() would block for 30s when no error is shown
				const errorSummary = page.locator(".govuk-error-summary, .error-summary").first();
				const errorMessage = (await errorSummary.count()) > 0
					? await errorSummary.textContent()
					: null;
				console.log("[dvlaBrowseVerify] Error message:", errorMessage);
				if (errorMessage) {
					return {
						error: `DVLA verification failed: ${errorMessage.trim()}`,
					};
				}

				// 11. Extract "Your details" tab data using GOV.UK summary list structure
				await emit("extract", "Extracting driver details from Your details tab", "your details", { screenshot: false });

				const yourDetailsData = await extractSummaryListData(page, "main");
				console.log("[dvlaBrowseVerify] Your details data:", yourDetailsData);

				const driver = parseDriverDetails(yourDetailsData);
				const licence = parseLicenceDetails(yourDetailsData);
				console.log("[dvlaBrowseVerify] Parsed driver:", driver);
				console.log("[dvlaBrowseVerify] Parsed licence:", licence);

				// 12. Navigate to "Vehicles you can drive" tab

				let vehiclesText = "";
				try {
					const vehiclesTab = page.locator(TAB_SELECTORS.vehiclesTab);
					const vehiclesVisible = await vehiclesTab.isVisible().catch(() => false);

					if (vehiclesVisible) {
						await vehiclesTab.click();
						await page.waitForLoadState("networkidle");
						await page.waitForTimeout(1000);

						// Try to expand all sections
						try {
							const showAllBtn = page.locator(RESULT_SELECTORS.showAllSectionsBtn);
							const showAllVisible = await showAllBtn.isVisible().catch(() => false);
							if (showAllVisible) {
								await showAllBtn.click();
								await page.waitForTimeout(500);
							}
						} catch {
							// Show all button might not exist
						}

						await emit("navigate", "Opened Vehicles tab", "vehicles tab");

						// Get vehicles content
						const vehiclesContent = page.locator(RESULT_SELECTORS.vehiclesWrapper);
						vehiclesText = await vehiclesContent.textContent() || "";
					} else {
						// Fallback: look for entitlements on current page
						vehiclesText = await page.locator("main").textContent() || "";
					}
				} catch {
					vehiclesText = "";
				}

				await emit("extract", "Extracted vehicle entitlements", "entitlements", { screenshot: false });
				const entitlements = parseEntitlements(vehiclesText);

				// 13. Navigate to "Penalties and disqualifications" tab

				let penaltiesText = "";
				try {
					const penaltiesTab = page.locator(TAB_SELECTORS.penaltiesTab);
					const penaltiesVisible = await penaltiesTab.isVisible().catch(() => false);

					if (penaltiesVisible) {
						await penaltiesTab.click();
						await page.waitForLoadState("networkidle");
						await page.waitForTimeout(1000);
						await emit("navigate", "Opened Penalties tab", "penalties tab");

						// Get penalties content
						penaltiesText = await page.locator("main").textContent() || "";
					}
				} catch {
					penaltiesText = "";
				}

				await emit("extract", "Extracted penalties information", "penalties", { screenshot: false });
				const { endorsements, totalPoints } = parsePenalties(penaltiesText);

				// 14. Build final result
				const hasPenalties = endorsements.length > 0 || totalPoints > 0;
				const isDisqualified = licence.status.includes("disqualified") || licence.status.includes("revoked");
				const verified = !isDisqualified && licence.status !== "unknown";

				const result: DVLAVerificationResult = {
					driver,
					licence,
					entitlements,
					endorsements,
					verified,
					hasPenalties,
					totalPoints,
				};

				await emit("complete", `Verification complete: ${verified ? "Valid licence" : "Verification issues found"}`,
					`${entitlements.length} entitlements, ${totalPoints} points`, { screenshot: false });

				console.log("[dvlaBrowseVerify] SUCCESS - returning result");

				// Flatten to simple structure like BLS tool
				return {
					data: {
						result: {
							success: true,
							message: `Licence ${verified ? "verified" : "has issues"}. Status: ${licence.status}. ${entitlements.length} entitlements. ${totalPoints} penalty points.`,
							verified,
						},
						fields: {
							fullName: driver.fullName,
							dateOfBirth: driver.dateOfBirth,
							licenceStatus: licence.status,
							validFrom: licence.validFrom,
							validTo: licence.validTo,
							entitlementCount: String(entitlements.length),
							totalPoints: String(totalPoints),
							hasPenalties: String(hasPenalties),
						},
						liveViewUrl,
						browserSessionId: sessionId,
						verified,
						screenshotPaths,
					},
				};
			} catch (error) {
				console.error("[dvlaBrowseVerify] CAUGHT ERROR:", error);
				return {
					error: `DVLA verification failed: ${error instanceof Error ? error.message : "Unknown error"}`,
				};
			} finally {
				abortSignal?.removeEventListener("abort", closeOnAbort);
				console.log("[dvlaBrowseVerify] Entering finally block");
				if (browser) {
					try {
						await Promise.race([
							browser.close(),
							new Promise((_, reject) => setTimeout(() => reject(new Error("Browser close timeout")), 5000))
						]);
						console.log("[dvlaBrowseVerify] Browser closed");
					} catch (err) {
						console.log("[dvlaBrowseVerify] Browser close error (ignored):", err);
					}
				}
				// Release the BrowserBase session so the recording is finalised
				if (bb && bbSessionId && projectId) {
					try {
						await bb.sessions.update(bbSessionId, { projectId, status: "REQUEST_RELEASE" });
						console.log("[dvlaBrowseVerify] Session released");
					} catch (err) {
						console.log("[dvlaBrowseVerify] Session release error (ignored):", err);
					}
				}
				console.log("[dvlaBrowseVerify] Finally block complete");
			}
		},
	});
}

/** Default instance (no streaming) */
export const dvlaBrowseVerify = createDvlaBrowseVerify();
