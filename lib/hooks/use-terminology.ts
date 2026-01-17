"use client";

import { useOrg } from "@/lib/org-context";

/**
 * Default terminology values used when an org hasn't customised their terminology.
 */
export const DEFAULT_TERMINOLOGY = {
	candidate: "Candidate",
	placement: "Placement",
	workNode: "Location",
	application: "Application",
	job: "Job",
} as const;

export type TerminologyKey = keyof typeof DEFAULT_TERMINOLOGY;

export interface Terminology {
	/** Singular form - e.g. "Candidate", "Carer", "Traveler" */
	candidate: string;
	/** Singular form - e.g. "Placement", "Assignment", "Booking" */
	placement: string;
	/** Singular form - e.g. "Location", "Site", "Work Location" */
	workNode: string;
	/** Singular form - e.g. "Application", "Submission" */
	application: string;
	/** Singular form - e.g. "Job", "Vacancy", "Position" */
	job: string;
}

/**
 * Words where singular and plural are the same.
 */
const UNCOUNTABLE = new Set(["talent", "staff", "personnel", "crew"]);

/**
 * Pluralise a terminology term.
 * Handles basic English pluralisation rules and irregular plurals.
 */
function pluralise(term: string): string {
	// Check for uncountable nouns (same singular/plural)
	if (UNCOUNTABLE.has(term.toLowerCase())) {
		return term;
	}
	if (term.endsWith("y")) {
		// Check if preceded by a vowel
		const beforeY = term.charAt(term.length - 2).toLowerCase();
		if (["a", "e", "i", "o", "u"].includes(beforeY)) {
			return `${term}s`; // e.g. "key" -> "keys"
		}
		return `${term.slice(0, -1)}ies`; // e.g. "Vacancy" -> "Vacancies"
	}
	if (term.endsWith("s") || term.endsWith("x") || term.endsWith("ch") || term.endsWith("sh")) {
		return `${term}es`;
	}
	return `${term}s`;
}

/**
 * Hook to access the current organisation's terminology.
 * Returns default values if the org hasn't customised their terminology.
 *
 * @example
 * const { candidate, candidates } = useTerminology();
 * // For Oakwood Care: { candidate: "Carer", candidates: "Carers" }
 * // For default: { candidate: "Candidate", candidates: "Candidates" }
 */
export function useTerminology() {
	const { selectedOrg } = useOrg();
	const orgTerminology = selectedOrg?.settings?.terminology;

	const terminology: Terminology = {
		candidate: orgTerminology?.candidate ?? DEFAULT_TERMINOLOGY.candidate,
		placement: orgTerminology?.placement ?? DEFAULT_TERMINOLOGY.placement,
		workNode: orgTerminology?.workNode ?? DEFAULT_TERMINOLOGY.workNode,
		application: orgTerminology?.application ?? DEFAULT_TERMINOLOGY.application,
		job: orgTerminology?.job ?? DEFAULT_TERMINOLOGY.job,
	};

	return {
		// Singular forms
		...terminology,

		// Plural forms (computed)
		candidates: pluralise(terminology.candidate),
		placements: pluralise(terminology.placement),
		workNodes: pluralise(terminology.workNode),
		applications: pluralise(terminology.application),
		jobs: pluralise(terminology.job),

		// Raw terminology record for custom keys
		raw: orgTerminology ?? {},
	};
}
