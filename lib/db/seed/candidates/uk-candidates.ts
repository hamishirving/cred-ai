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
	/** Elements awaiting admin review (slugs) - status will be 'requires_review' */
	pendingAdminReview?: string[];
	/** Elements awaiting third party (slugs) - status will be 'pending' with source 'external_check' */
	pendingThirdParty?: string[];
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
	// NEW: Candidate waiting on admin review
	{
		profile: {
			email: "hannah.clarke@email.com",
			firstName: "Hannah",
			lastName: "Clarke",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1994-02-18"),
			status: "active",
			nationalId: generateNINumber(),
			professionalRegistration: generateNMCPin(),
			address: {
				line1: "45 River View",
				city: "York",
				postcode: "YO1 7HJ",
				country: "UK",
			},
		},
		roleSlug: "band-5-nurse",
		state: {
			status: "in_progress",
			pendingAdminReview: ["passport-id", "proof-of-address"],
			daysSinceActivity: 1,
			notes: "Documents uploaded 1 day ago. Awaiting compliance team review.",
		},
	},
	// NEW: Candidate waiting on third party (DBS check in progress)
	{
		profile: {
			email: "oliver.brooks@email.com",
			firstName: "Oliver",
			lastName: "Brooks",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1991-09-03"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "78 Station Road",
				city: "Reading",
				postcode: "RG1 1LX",
				country: "UK",
			},
		},
		roleSlug: "healthcare-assistant",
		state: {
			status: "near_complete",
			pendingThirdParty: ["enhanced-dbs"],
			startDateDays: 10,
			daysSinceActivity: 3,
			notes: "DBS check submitted and processing with DBS. All other docs complete.",
		},
	},
	// NEW: Mixed blocking - some on candidate, some on admin, some on third party
	{
		profile: {
			email: "amelia.foster@email.com",
			firstName: "Amelia",
			lastName: "Foster",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1997-11-25"),
			status: "active",
			nationalId: generateNINumber(),
			professionalRegistration: generateNMCPin(),
			address: {
				line1: "12 Garden Close",
				city: "Oxford",
				postcode: "OX1 2JD",
				country: "UK",
			},
		},
		roleSlug: "band-5-nurse",
		state: {
			status: "in_progress",
			missingElements: ["occupational-health"],
			pendingAdminReview: ["nmc-registration"],
			pendingThirdParty: ["employment-references"],
			startDateDays: 14,
			daysSinceActivity: 2,
			notes: "Mixed blockers: needs OH check, NMC docs under review, reference with previous employer.",
		},
	},
];

/**
 * UK Candidates for Oakwood Care Group (Domiciliary & Residential Care).
 *
 * Mix of domiciliary carers (visiting people in their homes) and
 * residential carers (working in care homes).
 */
export const oakwoodCandidates: CandidateProfile[] = [
	// COMPLIANT - Senior carers, fully onboarded
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
			notes: "Senior domiciliary carer in Manchester. 8 years experience. Mentors new starters.",
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
			notes: "Scotland-based dom care. Has PVG instead of DBS. Covers Edinburgh city centre rounds.",
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
				postcode: "SE1 7AA",
				country: "UK",
			},
		},
		roleSlug: "senior-care-worker",
		state: {
			status: "compliant",
			daysSinceActivity: 30,
			notes: "25 years in care. Team lead at Oakwood Manor residential. Gold standard.",
		},
	},

	// NEAR COMPLETE - Almost ready to work
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
			notes: "Edinburgh. Just needs to complete Safeguarding Level 2. Booked on course next week.",
		},
	},
	{
		profile: {
			email: "rashid.hussain@email.com",
			firstName: "Rashid",
			lastName: "Hussain",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1990-06-15"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "78 Wilmslow Road",
				city: "Manchester",
				postcode: "M14 5UQ",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "near_complete",
			pendingThirdParty: ["enhanced-dbs"],
			startDateDays: 7,
			daysSinceActivity: 3,
			notes: "DBS submitted and processing. Provisionally starting Manchester dom care next Monday.",
		},
	},

	// IN PROGRESS - New starters, onboarding
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
				line1: "34 Whiteladies Road",
				city: "Bristol",
				postcode: "BS8 2LG",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "in_progress",
			missingElements: ["care-certificate", "manual-handling", "infection-control"],
			daysSinceActivity: 1,
			notes: "Career changer from retail. Enthusiastic. Working through Care Certificate.",
		},
	},
	{
		profile: {
			email: "priya.sharma@email.com",
			firstName: "Priya",
			lastName: "Sharma",
			phone: generateUKPhone(),
			dateOfBirth: new Date("1995-03-22"),
			status: "active",
			nationalId: generateNINumber(),
			address: {
				line1: "15 Brick Lane",
				city: "London",
				postcode: "E1 6PU",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "in_progress",
			missingElements: ["enhanced-dbs", "employment-references"],
			pendingAdminReview: ["right-to-work"],
			daysSinceActivity: 2,
			notes: "Returning to care after maternity leave. RTW docs uploaded, awaiting review.",
		},
	},

	// EXPIRING - Need renewals
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
				line1: "89 Byres Road",
				city: "Glasgow",
				postcode: "G12 8TT",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "expiring",
			expiringElements: ["pvg-scheme"],
			daysSinceActivity: 4,
			notes: "Glasgow dom care. PVG renewal due in 14 days. Reminder sent.",
		},
	},

	// STUCK - Blocked, needs intervention
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
				city: "Liverpool",
				postcode: "L17 8XZ",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "stuck",
			missingElements: ["enhanced-dbs"],
			daysSinceActivity: 21,
			notes: "DBS application stalled - address history issue. Multiple chase attempts failed.",
		},
	},

	// NON-COMPLIANT - Expired, can't work
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
				postcode: "E14 6AN",
				country: "UK",
			},
		},
		roleSlug: "care-worker",
		state: {
			status: "non_compliant",
			expiringElements: ["enhanced-dbs", "right-to-work"],
			daysSinceActivity: 0,
			notes: "DBS expired yesterday. Currently stood down from dom care rounds until renewed.",
		},
	},
];
