/**
 * FA Package Map
 *
 * Maps Credentially compliance element slugs <-> FA reportItem types.
 * Used to translate FA screening results back to compliance element updates.
 *
 * reportItem.type values come from the real Sterling API (human-readable strings).
 */

/** Maps our element slugs to the FA reportItem type that fulfils them */
export const elementToFAComponent: Record<string, string> = {
	"federal-background-check": "Enhanced Nationwide Criminal Search (7 year)",
	"county-background-check": "County Criminal Record",
	"state-background-check": "State Criminal Repository",
	"ssn-verification": "SSN Trace",
	"sex-offender-check": "DOJ Sex Offender Search",
	"facis-check": "FACIS L3",
	"oig-exclusion-check": "OIG-Excluded Parties",
	"sam-exclusion-check": "GSA-Excluded Parties",
	"drivers-record": "Drivers Record",
	"nationwide-background-check": "Enhanced Nationwide Criminal Search (7 year)",
	"drug-screen": "Drug Screen - 13 Panel",
	"tb-test": "TB Test - QuantiFERON",
	"physical-examination": "Physical Examination",
};

/** Reverse map: FA reportItem type -> compliance element slug */
export const faComponentToElement: Record<string, string> = {
	"SSN Trace": "ssn-verification",
	"Enhanced Nationwide Criminal Search (7 year)": "nationwide-background-check",
	"County Criminal Record": "county-background-check",
	"State Criminal Repository": "state-background-check",
	"Drivers Record": "drivers-record",
	"OIG-Excluded Parties": "oig-exclusion-check",
	"GSA-Excluded Parties": "sam-exclusion-check",
	"FACIS L3": "facis-check",
	"DOJ Sex Offender Search": "sex-offender-check",
	"National Wants Warrants": "national-wants-warrants",
	"Drug Screen - 13 Panel": "drug-screen",
	"TB Test - QuantiFERON": "tb-test",
	"Physical Examination": "physical-examination",
};

/**
 * Given FA screening reportItems, determine which compliance elements they fulfil.
 */
export function mapScreeningToElements(
	reportItems: Array<{ type: string; status: string; result?: string | null }>,
): Array<{
	elementSlug: string;
	faReportItemType: string;
	status: string;
	result?: string | null;
	canMarkVerified: boolean;
}> {
	return reportItems
		.filter((item) => faComponentToElement[item.type])
		.map((item) => ({
			elementSlug: faComponentToElement[item.type],
			faReportItemType: item.type,
			status: item.status,
			result: item.result,
			canMarkVerified: item.status === "complete" && item.result === "clear",
		}));
}
