/**
 * Demo Candidates
 *
 * Sample candidate data for testing voice AI employment verification.
 * Phone numbers should be configured to test numbers you control.
 */

// ============================================
// Types
// ============================================

export interface ReferenceContact {
	name: string;
	title: string;
	phone: string; // E.164 format
	email?: string;
}

export interface WorkHistory {
	id: string;
	jobTitle: string;
	companyName: string;
	startDate: string; // YYYY-MM format
	endDate?: string; // YYYY-MM format, undefined if current
	employmentType: "full-time" | "part-time" | "contract" | "intern";
	responsibilities?: string;
	reference?: ReferenceContact;
}

export interface CurrentApplication {
	jobTitle: string;
	companyName: string;
	applicationDate: string; // YYYY-MM-DD format
}

export interface DemoCandidate {
	id: string;
	name: string;
	email: string;
	currentApplication: CurrentApplication;
	workHistory: WorkHistory[];
}

// ============================================
// Sample Data
// ============================================

/**
 * Demo phone number - replace with your test number
 * This should be a number you control for demo purposes
 */
const DEMO_PHONE = "+447780781414";

export const demoCandidates: DemoCandidate[] = [
	{
		id: "cand-001",
		name: "Sarah Mitchell",
		email: "sarah.mitchell@example.com",
		currentApplication: {
			jobTitle: "Senior Staff Nurse",
			companyName: "Royal London Hospital NHS Trust",
			applicationDate: "2025-10-15",
		},
		workHistory: [
			{
				id: "work-001-1",
				jobTitle: "Staff Nurse - Acute Medicine",
				companyName: "Manchester Royal Infirmary",
				startDate: "2023-03",
				endDate: "2025-09",
				employmentType: "full-time",
				responsibilities:
					"Patient care and assessment, medication administration, clinical documentation, mentoring junior staff",
				reference: {
					name: "Sister Jane Thompson",
					title: "Ward Manager",
					phone: DEMO_PHONE,
					email: "j.thompson@mft.nhs.uk",
				},
			},
			{
				id: "work-001-2",
				jobTitle: "Registered Nurse - Emergency Department",
				companyName: "Salford Royal Hospital",
				startDate: "2021-06",
				endDate: "2023-02",
				employmentType: "full-time",
				responsibilities:
					"Emergency triage, acute patient care, trauma response, IV therapy administration",
				reference: {
					name: "Dr. Emma Richardson",
					title: "Clinical Lead",
					phone: DEMO_PHONE,
					email: "e.richardson@srft.nhs.uk",
				},
			},
			{
				id: "work-001-3",
				jobTitle: "Healthcare Assistant",
				companyName: "Stepping Hill Hospital",
				startDate: "2020-09",
				endDate: "2021-05",
				employmentType: "part-time",
				responsibilities:
					"Patient observations, personal care, mobility assistance, clinical support duties",
				// No reference available
			},
		],
	},
	{
		id: "cand-002",
		name: "Dr. Marcus Thompson",
		email: "marcus.thompson@example.com",
		currentApplication: {
			jobTitle: "Consultant Physician",
			companyName: "Birmingham University Hospitals NHS Trust",
			applicationDate: "2025-10-20",
		},
		workHistory: [
			{
				id: "work-002-1",
				jobTitle: "Specialty Doctor - General Medicine",
				companyName: "Leeds Teaching Hospitals NHS Trust",
				startDate: "2022-01",
				endDate: "2025-10",
				employmentType: "full-time",
				responsibilities:
					"Ward rounds, patient diagnosis and treatment, clinical audits, medical education and supervision",
				reference: {
					name: "Dr. Priya Sharma",
					title: "Clinical Director",
					phone: DEMO_PHONE,
					email: "p.sharma@lth.nhs.uk",
				},
			},
			{
				id: "work-002-2",
				jobTitle: "Core Medical Trainee",
				companyName: "Sheffield Teaching Hospitals",
				startDate: "2019-08",
				endDate: "2021-12",
				employmentType: "full-time",
				responsibilities:
					"Acute medical admissions, patient management, clinical procedures, on-call duties",
				reference: {
					name: "Dr. Robert Williams",
					title: "Training Programme Director",
					phone: DEMO_PHONE,
					email: "r.williams@sth.nhs.uk",
				},
			},
			{
				id: "work-002-3",
				jobTitle: "Foundation Year Doctor",
				companyName: "Nottingham University Hospitals",
				startDate: "2018-08",
				endDate: "2019-07",
				employmentType: "contract",
				responsibilities:
					"Clinical rotations, patient assessments, treatment plans, multidisciplinary team collaboration",
				// No reference available
			},
		],
	},
	{
		id: "cand-003",
		name: "Aisha Patel",
		email: "aisha.patel@example.com",
		currentApplication: {
			jobTitle: "Lead Healthcare Assistant",
			companyName: "Bupa Cromwell Hospital",
			applicationDate: "2025-10-18",
		},
		workHistory: [
			{
				id: "work-003-1",
				jobTitle: "Senior Healthcare Assistant - Cardiology",
				companyName: "Guy's and St Thomas' NHS Trust",
				startDate: "2021-11",
				endDate: "2025-09",
				employmentType: "full-time",
				responsibilities:
					"Patient vital signs monitoring, ECG recording, phlebotomy, post-operative care, team supervision",
				reference: {
					name: "Sister Sophie Chen",
					title: "Senior Sister",
					phone: DEMO_PHONE,
					email: "s.chen@gstt.nhs.uk",
				},
			},
			{
				id: "work-003-2",
				jobTitle: "Healthcare Assistant - Surgical Ward",
				companyName: "King's College Hospital",
				startDate: "2019-02",
				endDate: "2021-10",
				employmentType: "full-time",
				responsibilities:
					"Pre and post-operative patient care, wound dressing, infection control, patient mobility support",
				reference: {
					name: "Charge Nurse Michael O'Brien",
					title: "Ward Manager",
					phone: DEMO_PHONE,
					email: "m.obrien@kch.nhs.uk",
				},
			},
			{
				id: "work-003-3",
				jobTitle: "Care Support Worker",
				companyName: "Lewisham Hospital",
				startDate: "2017-09",
				endDate: "2019-01",
				employmentType: "part-time",
				responsibilities:
					"Patient personal care, feeding assistance, bed making, clinical observations",
				// No reference available
			},
		],
	},
];

// ============================================
// Helpers
// ============================================

/**
 * Get all demo candidates
 */
export function getAllCandidates(): DemoCandidate[] {
	return demoCandidates;
}

/**
 * Get a candidate by ID
 */
export function getCandidateById(id: string): DemoCandidate | undefined {
	return demoCandidates.find((c) => c.id === id);
}

/**
 * Get work history item by ID
 */
export function getWorkHistoryById(
	candidateId: string,
	workHistoryId: string,
): WorkHistory | undefined {
	const candidate = getCandidateById(candidateId);
	if (!candidate) return undefined;
	return candidate.workHistory.find((wh) => wh.id === workHistoryId);
}

/**
 * Get all work history items with references for a candidate
 */
export function getVerifiableWorkHistory(
	candidateId: string,
): WorkHistory[] {
	const candidate = getCandidateById(candidateId);
	if (!candidate) return [];
	return candidate.workHistory.filter((wh) => wh.reference);
}

/**
 * Count available references for a candidate
 */
export function countReferences(candidateId: string): {
	available: number;
	total: number;
} {
	const candidate = getCandidateById(candidateId);
	if (!candidate) return { available: 0, total: 0 };

	const total = candidate.workHistory.length;
	const available = candidate.workHistory.filter((wh) => wh.reference).length;

	return { available, total };
}
