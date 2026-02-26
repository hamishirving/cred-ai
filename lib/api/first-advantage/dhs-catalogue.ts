/**
 * D&OHS Product Catalogue
 *
 * Static map of Drug & Occupational Health Screening product codes
 * from the Medsol QA account. Used for a la carte ordering via FA's
 * /v2/screenings endpoint.
 */

import type { FAAlacarteItem } from "./types";

// ============================================
// Types
// ============================================

export type DHSCategory = "drug_screen" | "clinical" | "physical" | "alcohol";

export interface DHSProduct {
	code: string;
	category: DHSCategory;
	type: string;
	name: string;
	description: string;
	/** Which compliance element slugs this product fulfils */
	fulfilsElements: string[];
}

// ============================================
// Product catalogue
// ============================================

export const DHS_PRODUCTS: Record<string, DHSProduct> = {
	DHS90007: {
		code: "DHS90007",
		category: "drug_screen",
		type: "Drug Screen",
		name: "5 Panel Urine Drug Screen",
		description: "Standard 5-panel urine drug test (AMP, COC, MAR, OPI, PCP)",
		fulfilsElements: ["drug-screen"],
	},
	DHS90008: {
		code: "DHS90008",
		category: "drug_screen",
		type: "Drug Screen",
		name: "10 Panel Urine Drug Screen",
		description: "Extended 10-panel urine drug test",
		fulfilsElements: ["drug-screen"],
	},
	DHS90009: {
		code: "DHS90009",
		category: "drug_screen",
		type: "Drug Screen",
		name: "12 Panel Urine Drug Screen",
		description: "Comprehensive 12-panel urine drug test",
		fulfilsElements: ["drug-screen"],
	},
	DHS90010: {
		code: "DHS90010",
		category: "drug_screen",
		type: "Drug Screen",
		name: "Urine Drug Screen + Alcohol",
		description: "Urine drug screen with alcohol metabolite (EtG)",
		fulfilsElements: ["drug-screen"],
	},
	DHS90011: {
		code: "DHS90011",
		category: "drug_screen",
		type: "Drug Screen",
		name: "Hair Follicle Drug Screen",
		description: "90-day detection window hair follicle test",
		fulfilsElements: ["drug-screen"],
	},
	DHS30063: {
		code: "DHS30063",
		category: "clinical",
		type: "Clinical/Lab",
		name: "Quantiferon TB Gold Plus",
		description: "Blood-based TB test (IGRA) — preferred over skin test",
		fulfilsElements: ["tb-test"],
	},
	DHS30064: {
		code: "DHS30064",
		category: "clinical",
		type: "Clinical/Lab",
		name: "TB Skin Test (PPD)",
		description: "Tuberculin skin test (Mantoux/PPD) — 2-step available",
		fulfilsElements: ["tb-test"],
	},
	DHS30065: {
		code: "DHS30065",
		category: "clinical",
		type: "Clinical/Lab",
		name: "Hepatitis B Surface Antibody",
		description: "Hep B immunity titre test",
		fulfilsElements: ["hepatitis-b"],
	},
	DHS30066: {
		code: "DHS30066",
		category: "clinical",
		type: "Clinical/Lab",
		name: "MMR Titre",
		description: "Measles, Mumps, Rubella immunity titre",
		fulfilsElements: ["mmr-titre"],
	},
	DHS30067: {
		code: "DHS30067",
		category: "clinical",
		type: "Clinical/Lab",
		name: "Varicella Titre",
		description: "Chickenpox immunity titre test",
		fulfilsElements: ["varicella-titre"],
	},
	DHS40001: {
		code: "DHS40001",
		category: "physical",
		type: "Physical",
		name: "Pre-Employment Physical Exam",
		description: "Standard pre-employment physical examination",
		fulfilsElements: ["physical-examination"],
	},
	DHS40002: {
		code: "DHS40002",
		category: "physical",
		type: "Physical",
		name: "Fit for Duty Assessment",
		description: "Functional capacity evaluation for role-specific duties",
		fulfilsElements: ["physical-examination"],
	},
	DHS50001: {
		code: "DHS50001",
		category: "alcohol",
		type: "Alcohol",
		name: "Alcohol Breath Test",
		description: "Point-of-care breath alcohol screening",
		fulfilsElements: ["alcohol-screen"],
	},
};

// ============================================
// Category display config
// ============================================

export const DHS_CATEGORY_ORDER: DHSCategory[] = [
	"drug_screen",
	"clinical",
	"physical",
	"alcohol",
];

export const DHS_CATEGORY_LABELS: Record<DHSCategory, string> = {
	drug_screen: "Drug Screening",
	clinical: "Clinical / Lab",
	physical: "Physical Examination",
	alcohol: "Alcohol Testing",
};

// ============================================
// Helpers
// ============================================

/**
 * Given missing compliance element slugs, recommend D&OHS products.
 * Returns the product code for the first (default) match per element.
 */
export function recommendDHSProducts(missingElementSlugs: string[]): string[] {
	const slugSet = new Set(missingElementSlugs);
	const recommended = new Set<string>();

	// For each missing slug, find the first product that fulfils it
	for (const slug of slugSet) {
		for (const product of Object.values(DHS_PRODUCTS)) {
			if (product.fulfilsElements.includes(slug)) {
				recommended.add(product.code);
				break; // One recommendation per element
			}
		}
	}

	return Array.from(recommended);
}

/**
 * Convert selected product codes into FA a la carte items.
 */
export function toAlacarteItems(codes: string[]): FAAlacarteItem[] {
	return codes
		.map((code) => {
			const product = DHS_PRODUCTS[code];
			if (!product) return null;
			return {
				product: "RDT",
				root: code,
				description: product.name,
			};
		})
		.filter((item): item is FAAlacarteItem => item !== null);
}

/**
 * Get all products grouped by category in display order.
 */
export function getProductsByCategory(): Array<{
	category: DHSCategory;
	label: string;
	products: DHSProduct[];
}> {
	return DHS_CATEGORY_ORDER.map((category) => ({
		category,
		label: DHS_CATEGORY_LABELS[category],
		products: Object.values(DHS_PRODUCTS).filter((p) => p.category === category),
	}));
}

/**
 * Check if any D&OHS-related elements are outstanding.
 */
export const DHS_ELEMENT_SLUGS = new Set([
	"drug-screen",
	"tb-test",
	"physical-examination",
	"hepatitis-b",
	"mmr-titre",
	"varicella-titre",
	"alcohol-screen",
]);
