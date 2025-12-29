/**
 * UK Candidate Profiles
 *
 * Named candidates with varied compliance states for realistic demos.
 */
import type { NewProfile } from "../../schema";
import { generateNINumber, generateNMCPin, generateUKPhone, daysFromNow } from "../utils";

/**
 * Candidate compliance state for generating appropriate evidence.
 */
export interface CandidateState {
	/** Overall compliance status */
	status: "compliant" | "near_complete" | "in_progress" | "stuck" | "expiring" | "non_compliant";
	/** Elements that are missing (slugs) */
	missingElements?: string[];
	/** Elements expiring soon (slugs) */
	expiringElements?: string[];
	/** Days until start date (if applicable) */
	startDateDays?: number;
	/** Days since last activity */
	daysSinceActivity?: number;
	/** Special notes */
	notes?: string;
}

/**
 * Extended profile with state information for seeding.
 */
export interface CandidateProfile {
	profile: Omit<NewProfile, "organisationId">;
	roleSlug: string;
	state: CandidateState;
}

/**
 * UK Candidates for Meridian Healthcare (Agency).
 */
export const meridianCandidates: CandidateProfile[] = [
	{
		profile: {
			email: "sarah.thompson@email.com",
			firstName: "Sarah",
			lastName: "Thompson",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1992-05-14"),
			status: "active",
			nationalId: generateNINumber(),
			professionalRegistration: generateNMCPin(),
			address: {
				line1: "42 Oak Street",
				city: "Manchester",
				postcode: "M1 4BT",
				country: "UK",
			},
		},
		roleSlug: "band-5-nurse",
		state: {
			status: "near_complete",
			missingElements: ["enhanced-dbs"],
			startDateDays: 3,
			daysSinceActivity: 2,
			notes: "Nearly complete, missing DBS, starts Monday. Priority chase.",
		},
	},
	{
		profile: {
			email: "james.wilson@email.com",
			firstName: "James",
			lastName: "Wilson",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1988-11-22"),
			status: "active",
			nationalId: generateNINumber(),
			professionalRegistration: generateNMCPin(),
			address: {
				line1: "15 Victoria Road",
				city: "Birmingham",
				postcode: "B1 2RA",
				country: "UK",
			},
		},
		roleSlug: "band-5-nurse",
		state: {
			status: "stuck",
			missingElements: ["enhanced-dbs", "employment-references"],
			expiringElements: ["nmc-registration"],
			daysSinceActivity: 14,
			notes: "Unresponsive for 2 weeks. NMC expiring in 7 days. Needs escalation.",
		},
	},
	{
		profile: {
			email: "emily.chen@email.com",
			firstName: "Emily",
			lastName: "Chen",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1995-03-08"),
			status: "active",
			nationalId: generateNINumber(),
			professionalRegistration: generateNMCPin(),
			address: {
				line1: "88 Park Lane",
				city: "Leeds",
				postcode: "LS1 3EX",
				country: "UK",
			},
		},
		roleSlug: "band-6-nurse",
		state: {
			status: "compliant",
			daysSinceActivity: 5,
			notes: "Fully compliant, recently cleared. Active placement at City Hospital ICU.",
		},
	},
	{
		profile: {
			email: "mohammed.ali@email.com",
			firstName: "Mohammed",
			lastName: "Ali",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1999-07-19"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "23 Station Road",
				city: "Bradford",
				postcode: "BD1 4XY",
				country: "UK",
			},
		},
		roleSlug: "healthcare-assistant",
		state: {
			status: "in_progress",
			missingElements: [
				"enhanced-dbs",
				"right-to-work",
				"bls-uk",
				"manual-handling",
				"employment-references",
			],
			daysSinceActivity: 3,
			notes: "New starter, 40% complete. Good engagement so far.",
		},
	},
	{
		profile: {
			email: "lisa.anderson@email.com",
			firstName: "Lisa",
			lastName: "Anderson",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1985-09-30"),
			status: "active",
			nationalId: generateNINumber(),
			professionalRegistration: generateNMCPin(),
			address: {
				line1: "67 High Street",
				city: "Newcastle",
				postcode: "NE1 5AF",
				country: "UK",
			},
		},
		roleSlug: "band-5-nurse",
		state: {
			status: "expiring",
			expiringElements: ["enhanced-dbs"],
			daysSinceActivity: 3,
			notes: "DBS expires in 12 days. AI sent renewal reminder.",
		},
	},
	{
		profile: {
			email: "david.brown@email.com",
			firstName: "David",
			lastName: "Brown",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1978-12-05"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "9 Church Lane",
				city: "Liverpool",
				postcode: "L1 9DQ",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "compliant",
			daysSinceActivity: 10,
			notes: "Experienced care worker. Multiple active placements. All docs current.",
		},
	},
	{
		profile: {
			email: "rachel.green@email.com",
			firstName: "Rachel",
			lastName: "Green",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1990-04-17"),
			status: "active",
			nationalId: generateNINumber(),
			professionalRegistration: generateNMCPin(),
			address: {
				line1: "112 Queens Road",
				city: "Sheffield",
				postcode: "S1 2DW",
				country: "UK",
			},
		},
		roleSlug: "band-6-nurse",
		state: {
			status: "in_progress",
			missingElements: ["nhs-trust-induction", "ward-orientation"],
			daysSinceActivity: 7,
			notes: "Transferred from another agency. Candidate-scoped items complete, needs placement items.",
		},
	},
	{
		profile: {
			email: "michael.taylor@email.com",
			firstName: "Michael",
			lastName: "Taylor",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1993-08-25"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "34 King Street",
				city: "Bristol",
				postcode: "BS1 4QT",
				country: "UK",
			},
		},
		roleSlug: "healthcare-assistant",
		state: {
			status: "near_complete",
			missingElements: ["fire-safety"],
			daysSinceActivity: 1,
			notes: "Just missing Fire Safety training. Should complete today.",
		},
	},
	{
		profile: {
			email: "sophie.williams@email.com",
			firstName: "Sophie",
			lastName: "Williams",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1996-01-12"),
			status: "active",
			nationalId: generateNINumber(),
			professionalRegistration: generateNMCPin(),
			address: {
				line1: "56 Market Place",
				city: "Nottingham",
				postcode: "NG1 2GR",
				country: "UK",
			},
		},
		roleSlug: "band-5-nurse",
		state: {
			status: "stuck",
			missingElements: ["passport-id"],
			daysSinceActivity: 5,
			notes: "Passport document rejected - blurry image. Needs to resubmit.",
		},
	},
	{
		profile: {
			email: "thomas.harris@email.com",
			firstName: "Thomas",
			lastName: "Harris",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1982-06-28"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "78 Mill Road",
				city: "Cambridge",
				postcode: "CB1 2AD",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "compliant",
			daysSinceActivity: 15,
			notes: "Long-tenured care worker. All documents current. Low touch.",
		},
	},
];

/**
 * UK Candidates for Oakwood Care (Direct Employer).
 */
export const oakwoodCandidates: CandidateProfile[] = [
	{
		profile: {
			email: "karen.mitchell@email.com",
			firstName: "Karen",
			lastName: "Mitchell",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1980-02-14"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "23 Maple Avenue",
				city: "Manchester",
				postcode: "M20 1AA",
				country: "UK",
			},
		},
		roleSlug: "senior-care-worker",
		state: {
			status: "compliant",
			daysSinceActivity: 7,
			notes: "Senior carer in Manchester. Fully compliant.",
		},
	},
	{
		profile: {
			email: "brian.campbell@email.com",
			firstName: "Brian",
			lastName: "Campbell",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1975-10-03"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "45 Thistle Street",
				city: "Edinburgh",
				postcode: "EH2 1EN",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "compliant",
			daysSinceActivity: 12,
			notes: "Scotland-based. Has PVG instead of DBS. Fully compliant.",
		},
	},
	{
		profile: {
			email: "fiona.macdonald@email.com",
			firstName: "Fiona",
			lastName: "MacDonald",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1988-05-22"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "12 Royal Mile",
				city: "Edinburgh",
				postcode: "EH1 2PB",
				country: "UK",
			},
		},
		roleSlug: "senior-care-worker",
		state: {
			status: "near_complete",
			missingElements: ["safeguarding-adults"],
			daysSinceActivity: 2,
			notes: "Edinburgh senior carer. Missing one training module.",
		},
	},
	{
		profile: {
			email: "alan.wright@email.com",
			firstName: "Alan",
			lastName: "Wright",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1970-12-08"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "89 London Road",
				city: "Glasgow",
				postcode: "G1 5PQ",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "expiring",
			expiringElements: ["pvg-scheme"],
			daysSinceActivity: 4,
			notes: "Glasgow care worker. PVG needs renewal.",
		},
	},
	{
		profile: {
			email: "janet.lewis@email.com",
			firstName: "Janet",
			lastName: "Lewis",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1992-07-16"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "34 Bristol Road",
				city: "Bristol",
				postcode: "BS1 5TY",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "in_progress",
			missingElements: ["care-certificate", "manual-handling", "infection-control"],
			daysSinceActivity: 1,
			notes: "New starter in Bristol. Core training in progress.",
		},
	},
	{
		profile: {
			email: "peter.jones@email.com",
			firstName: "Peter",
			lastName: "Jones",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1983-03-29"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "67 Oak Drive",
				city: "Leeds",
				postcode: "LS6 2EQ",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "stuck",
			missingElements: ["enhanced-dbs"],
			daysSinceActivity: 21,
			notes: "DBS application stalled. No response to multiple chases.",
		},
	},
	{
		profile: {
			email: "mary.clark@email.com",
			firstName: "Mary",
			lastName: "Clark",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1965-11-11"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "101 High Street",
				city: "London",
				postcode: "SW1A 1AA",
				country: "UK",
			},
		},
		roleSlug: "senior-care-worker",
		state: {
			status: "compliant",
			daysSinceActivity: 30,
			notes: "Very experienced. All documents current. Minimal contact needed.",
		},
	},
	{
		profile: {
			email: "chris.davies@email.com",
			firstName: "Chris",
			lastName: "Davies",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1998-04-05"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "22 Park View",
				city: "London",
				postcode: "E1 6AN",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "non_compliant",
			expiringElements: ["enhanced-dbs", "right-to-work"],
			daysSinceActivity: 0,
			notes: "DBS just expired yesterday. Urgent renewal needed.",
		},
	},
];
