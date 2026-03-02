const HOURS_PER_RUN = 1.5;
const HOURLY_RATE_GBP = 35;
const HOURLY_RATE_USD = 45;

export function detectCurrencyByOrgName(orgName: string | undefined): {
	symbol: "£" | "$";
	rate: number;
} {
	if (!orgName) {
		return { symbol: "£", rate: HOURLY_RATE_GBP };
	}

	const lower = orgName.toLowerCase();
	if (
		lower.includes("travel") ||
		lower.includes("lakeside") ||
		lower.includes("us") ||
		lower.includes("texas") ||
		lower.includes("america")
	) {
		return { symbol: "$", rate: HOURLY_RATE_USD };
	}

	return { symbol: "£", rate: HOURLY_RATE_GBP };
}

export function buildValueEstimate({
	completedRuns,
	orgName,
}: {
	completedRuns: number;
	orgName?: string;
}) {
	const currency = detectCurrencyByOrgName(orgName);
	const hoursSaved = Math.round(completedRuns * HOURS_PER_RUN * 10) / 10;
	const moneySaved = Math.round(hoursSaved * currency.rate);

	return {
		completedRuns,
		hoursSaved,
		hourlyRate: currency.rate,
		currencySymbol: currency.symbol,
		moneySaved,
		model: "heuristic_v1" as const,
	};
}
