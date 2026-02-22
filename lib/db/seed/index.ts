/**
 * Main Seed Script
 *
 * Seeds the database with multi-market demo data.
 * Run with: pnpm db:seed
 */
import { eq, and, isNotNull } from "drizzle-orm";
import { db, closeConnection } from "./db";
import { clearOrgData } from "./clear";

import {
	organisations,
	workNodeTypes,
	workNodes,
	roles,
	userRoles,
	complianceElements,
	compliancePackages,
	packageElements,
	users,
	orgMemberships,
	profiles,
	placements,
	evidence,
	pipelines,
	pipelineStages,
	entityStagePositions,
	activities,
	escalations,
	escalationOptions,
	tasks,
	referenceContacts,
} from "../schema";
import {
	ukComplianceElements,
	ukPackageTemplates,
	ukPackageContents,
	ukRoles,
	usComplianceElements,
	usPackageTemplates,
	usPackageContents,
	usRoles,
} from "./markets";
import {
	meridianCandidates,
	oakwoodCandidates,
	travelNurseCandidates,
	lakesideCandidates,
	type CandidateProfile,
} from "./candidates";
import { faHandledElements } from "./markets/us";
import { daysFromNow, slugify, randomPick, randomInt, atTime } from "./utils";

// ============================================
// Organisation Configurations
// ============================================

interface OrgConfig {
	name: string;
	slug: string;
	market: "uk" | "us";
	type: "agency" | "direct";
	description?: string;
	orgPrompt?: string;
	terminology?: Record<string, string>;
	workNodeTypes: { name: string; level: number }[];
	workNodes: { name: string; type: string; parent?: string; jurisdiction?: string; address?: string }[];
	candidates: CandidateProfile[];
}

const orgConfigs: OrgConfig[] = [
	{
		name: "Meridian Healthcare",
		slug: "meridian-healthcare",
		market: "uk",
		type: "agency",
		workNodeTypes: [
			{ name: "NHS Trust", level: 0 },
			{ name: "Hospital", level: 1 },
			{ name: "Ward", level: 2 },
			{ name: "Care Group", level: 0 },
			{ name: "Care Home", level: 1 },
		],
		workNodes: [
			{ name: "NHS Trust North", type: "NHS Trust", jurisdiction: "england" },
			{ name: "City Hospital", type: "Hospital", parent: "NHS Trust North", jurisdiction: "england", address: "Kingsway, Derby DE22 3NE" },
			{ name: "A&E", type: "Ward", parent: "City Hospital", jurisdiction: "england" },
			{ name: "ICU", type: "Ward", parent: "City Hospital", jurisdiction: "england" },
			{ name: "Medical Ward", type: "Ward", parent: "City Hospital", jurisdiction: "england" },
			{ name: "Community Hospital", type: "Hospital", parent: "NHS Trust North", jurisdiction: "england", address: "London Road, Buxton SK17 9NJ" },
			{ name: "NHS Trust South", type: "NHS Trust", jurisdiction: "england" },
			{ name: "General Hospital", type: "Hospital", parent: "NHS Trust South", jurisdiction: "england", address: "Bristol Road South, Birmingham B31 2AP" },
			{ name: "Private Care Group", type: "Care Group", jurisdiction: "england" },
			{ name: "Sunrise Care Home", type: "Care Home", parent: "Private Care Group", jurisdiction: "england", address: "45 Willow Lane, Cheltenham GL50 3PR" },
			{ name: "Oak Lodge Care Home", type: "Care Home", parent: "Private Care Group", jurisdiction: "england", address: "12 The Green, Solihull B91 3QR" },
		],
		candidates: meridianCandidates,
	},
	{
		name: "Oakwood Care Group",
		slug: "oakwood-care",
		market: "uk",
		type: "direct",
		description: "UK Domiciliary & Residential Care Provider",
		workNodeTypes: [
			{ name: "Region", level: 0 },
			{ name: "Branch", level: 1 },
		],
		workNodes: [
			// England - North West
			{ name: "North West", type: "Region", jurisdiction: "england" },
			{ name: "Manchester Dom Care", type: "Branch", parent: "North West", jurisdiction: "england", address: "Unit 4, Salford Enterprise Park, M6 5FT" },
			{ name: "Liverpool Dom Care", type: "Branch", parent: "North West", jurisdiction: "england", address: "8 Crown Street, Liverpool L7 3QD" },
			{ name: "Willow House Residential", type: "Branch", parent: "North West", jurisdiction: "england", address: "Willow House, 15 Park Avenue, Bolton BL1 4RD" },
			// England - South East
			{ name: "South East", type: "Region", jurisdiction: "england" },
			{ name: "London Dom Care", type: "Branch", parent: "South East", jurisdiction: "england", address: "3rd Floor, 100 Borough High Street, SE1 1LB" },
			{ name: "Kent Dom Care", type: "Branch", parent: "South East", jurisdiction: "england", address: "2 Station Road, Maidstone ME14 1QQ" },
			{ name: "Oakwood Manor Residential", type: "Branch", parent: "South East", jurisdiction: "england", address: "Oakwood Manor, Canterbury CT2 7HE" },
			// Scotland
			{ name: "Scotland", type: "Region", jurisdiction: "scotland" },
			{ name: "Edinburgh Dom Care", type: "Branch", parent: "Scotland", jurisdiction: "scotland", address: "14 Leith Walk, Edinburgh EH6 5DT" },
			{ name: "Glasgow Dom Care", type: "Branch", parent: "Scotland", jurisdiction: "scotland", address: "250 West George Street, Glasgow G2 4QY" },
			{ name: "Heather Glen Residential", type: "Branch", parent: "Scotland", jurisdiction: "scotland", address: "Heather Glen, Stirling FK8 2BX" },
		],
		orgPrompt: `You're writing on behalf of Oakwood Care Group, a family-run care provider delivering domiciliary and residential care across England and Scotland.

Tone: Warm, caring, and supportive. We're not a corporate - we're a family that genuinely cares about our team and the people we support.

Key messages:
- Person-centred care is everything
- Our carers make a real difference to people's lives every day
- CQC "Good" and "Outstanding" rated services
- Flexible shifts, supportive team, real career progression
- We invest in training and development

When chasing compliance items, be encouraging not demanding. Acknowledge that carers are busy people juggling multiple responsibilities. Offer help and support to get things done.

Sign off as: "The Oakwood Care Team"`,
		terminology: { candidate: "Carer", placement: "Placement" },
		candidates: oakwoodCandidates,
	},
	{
		name: "TravelNurse Pro",
		slug: "travelnurse-pro",
		market: "us",
		type: "agency",
		workNodeTypes: [
			{ name: "State", level: 0 },
			{ name: "Hospital", level: 1 },
			{ name: "Unit", level: 2 },
		],
		workNodes: [
			{ name: "California", type: "State", jurisdiction: "california" },
			{ name: "UCLA Medical Center", type: "Hospital", parent: "California", jurisdiction: "california", address: "757 Westwood Plaza, Los Angeles, CA 90095" },
			{ name: "Emergency Dept", type: "Unit", parent: "UCLA Medical Center", jurisdiction: "california" },
			{ name: "ICU", type: "Unit", parent: "UCLA Medical Center", jurisdiction: "california" },
			{ name: "Cedars-Sinai", type: "Hospital", parent: "California", jurisdiction: "california", address: "8700 Beverly Blvd, Los Angeles, CA 90048" },
			{ name: "Texas", type: "State", jurisdiction: "texas" },
			{ name: "Houston Methodist", type: "Hospital", parent: "Texas", jurisdiction: "texas", address: "6565 Fannin St, Houston, TX 77030" },
			{ name: "UT Southwestern", type: "Hospital", parent: "Texas", jurisdiction: "texas", address: "5323 Harry Hines Blvd, Dallas, TX 75390" },
			{ name: "Florida", type: "State", jurisdiction: "florida" },
			{ name: "Memorial Hospital Jacksonville", type: "Hospital", parent: "Florida", jurisdiction: "florida", address: "3625 University Blvd S, Jacksonville, FL 32216" },
			{ name: "Tampa General", type: "Hospital", parent: "Florida", jurisdiction: "florida", address: "1 Tampa General Cir, Tampa, FL 33606" },
			{ name: "Baptist Health Miami", type: "Hospital", parent: "Florida", jurisdiction: "florida", address: "8900 N Kendall Dr, Miami, FL 33176" },
		],
		terminology: { candidate: "Talent", placement: "Assignment" },
		candidates: travelNurseCandidates,
	},
	{
		name: "Lakeside Health System",
		slug: "lakeside-health",
		market: "us",
		type: "direct",
		workNodeTypes: [
			{ name: "Facility", level: 0 },
			{ name: "Department", level: 1 },
		],
		workNodes: [
			{ name: "Lakeside Medical Center", type: "Facility", jurisdiction: "texas", address: "2100 Lakeside Boulevard, Plano, TX 75024" },
			{ name: "Emergency Services", type: "Department", parent: "Lakeside Medical Center", jurisdiction: "texas" },
			{ name: "Surgical Services", type: "Department", parent: "Lakeside Medical Center", jurisdiction: "texas" },
			{ name: "Critical Care", type: "Department", parent: "Lakeside Medical Center", jurisdiction: "texas" },
			{ name: "Medical/Surgical Units", type: "Department", parent: "Lakeside Medical Center", jurisdiction: "texas" },
			{ name: "Lakeside Community Hospital", type: "Facility", jurisdiction: "texas", address: "850 Main Street, McKinney, TX 75069" },
			{ name: "General Care", type: "Department", parent: "Lakeside Community Hospital", jurisdiction: "texas" },
			{ name: "Lakeside Clinics", type: "Facility", jurisdiction: "texas", address: "4500 Elm Avenue, Frisco, TX 75034" },
			{ name: "Downtown Clinic", type: "Department", parent: "Lakeside Clinics", jurisdiction: "texas" },
			{ name: "Suburban Clinic", type: "Department", parent: "Lakeside Clinics", jurisdiction: "texas" },
		],
		terminology: { candidate: "Provider", placement: "Assignment" },
		candidates: lakesideCandidates,
	},
];

// ============================================
// Seeding Functions
// ============================================

async function seedOrganisation(config: OrgConfig) {
	console.log(`\n📦 Seeding ${config.name}...`);

	// Build org settings
	const marketLabel = config.market === "uk" ? "UK" : "US";
	const typeLabel = config.type === "agency" ? "Healthcare Agency" : "Healthcare Provider";
	const defaultDescription = `${marketLabel} ${typeLabel}`;

	const orgSettings = {
		defaultDataOwnership: "organisation" as const,
		terminology: config.terminology || (config.market === "uk"
			? { candidate: "Candidate", placement: "Booking" }
			: { candidate: "Traveler", placement: "Assignment" }),
		complianceContact: config.market === "uk"
			? {
					name: "Sarah Jones",
					email: `compliance@${config.slug}.com`,
					phone: "0800 123 4567",
				}
			: {
					name: "Michael Chen",
					email: `compliance@${config.slug}.com`,
					phone: "1-800-555-0123",
				},
		supportContact: {
			email: `support@${config.slug}.com`,
			phone: config.market === "uk" ? "0800 999 8888" : "1-800-555-0199",
		},
		aiCompanion: {
			enabled: true,
			orgPrompt: config.orgPrompt || (config.market === "uk"
				? `You're writing on behalf of ${config.name}, a leading healthcare staffing partner in the UK.

Tone: Warm, supportive, and professional. We help healthcare professionals find flexible work opportunities across NHS trusts and private care providers.

Be encouraging about the shifts and opportunities available once compliant. Mention that we have roles at NHS trusts and private care homes across the country.

Sign off as: "${config.name} Compliance Team"`
				: `You're writing on behalf of ${config.name}, a premier healthcare staffing agency serving facilities across the United States.

Tone: Friendly, professional, and supportive. We connect healthcare professionals with rewarding travel and permanent positions at top facilities.

Emphasize the variety of assignments available and our support throughout the credentialing process.

Sign off as: "${config.name} Credentialing Team"`),
			emailFrequency: "daily" as const,
			sendTime: config.market === "uk" ? "09:00" : "08:00",
			timezone: config.market === "uk" ? "Europe/London" : "America/Chicago",
		},
	};

	// Check if org already exists
	const existingOrg = await db
		.select()
		.from(organisations)
		.where(eq(organisations.slug, config.slug))
		.limit(1);

	let org: typeof organisations.$inferSelect;

	if (existingOrg.length > 0) {
		// UPSERT: Update existing org and clear its data
		org = existingOrg[0];
		console.log(`   ↻ Updating existing organisation...`);

		// Update org settings
		await db
			.update(organisations)
			.set({
				name: config.name,
				description: config.description || defaultDescription,
				settings: orgSettings,
			})
			.where(eq(organisations.id, org.id));

		// Clear all seeded data for this org
		await clearOrgData(org.id);
	} else {
		// CREATE: New organisation
		const [newOrg] = await db
			.insert(organisations)
			.values({
				name: config.name,
				slug: config.slug,
				description: config.description || defaultDescription,
				settings: orgSettings,
			})
			.returning();
		org = newOrg;
		console.log(`   ✓ Created organisation: ${org.name}`);
	}

	// 2. Create work node types
	const typeMap = new Map<string, string>();
	for (const typeConfig of config.workNodeTypes) {
		const [nodeType] = await db
			.insert(workNodeTypes)
			.values({
				organisationId: org.id,
				name: typeConfig.name,
				slug: slugify(typeConfig.name),
				level: typeConfig.level,
			})
			.returning();
		typeMap.set(typeConfig.name, nodeType.id);
	}
	console.log(`   ✓ Created ${config.workNodeTypes.length} work node types`);

	// 3. Create work nodes
	const nodeMap = new Map<string, string>();
	// First pass: create nodes without parents
	for (const nodeConfig of config.workNodes.filter((n) => !n.parent)) {
		const [node] = await db
			.insert(workNodes)
			.values({
				organisationId: org.id,
				typeId: typeMap.get(nodeConfig.type)!,
				name: nodeConfig.name,
				jurisdiction: nodeConfig.jurisdiction,
				address: nodeConfig.address,
			})
			.returning();
		nodeMap.set(nodeConfig.name, node.id);
	}
	// Second pass: create nodes with parents
	for (const nodeConfig of config.workNodes.filter((n) => n.parent)) {
		const [node] = await db
			.insert(workNodes)
			.values({
				organisationId: org.id,
				typeId: typeMap.get(nodeConfig.type)!,
				name: nodeConfig.name,
				parentId: nodeMap.get(nodeConfig.parent!),
				jurisdiction: nodeConfig.jurisdiction,
				address: nodeConfig.address,
			})
			.returning();
		nodeMap.set(nodeConfig.name, node.id);
	}
	console.log(`   ✓ Created ${config.workNodes.length} work nodes`);

	// 4. Create roles
	const roleTemplates = config.market === "uk" ? ukRoles : usRoles;
	const roleMap = new Map<string, string>();
	for (const roleTemplate of roleTemplates) {
		const [role] = await db
			.insert(roles)
			.values({
				...roleTemplate,
				organisationId: org.id,
			})
			.returning();
		roleMap.set(roleTemplate.slug, role.id);
	}
	console.log(`   ✓ Created ${roleTemplates.length} roles`);

	// 4b. Create user roles (permission roles)
	const defaultUserRoles = [
		{ name: "Admin", slug: "admin", description: "Full system access", permissions: ["*"], isDefault: false },
		{ name: "Compliance Officer", slug: "compliance-officer", description: "Manage compliance and evidence", permissions: ["profiles:*", "evidence:*", "escalations:*"], isDefault: false },
		{ name: "Recruiter", slug: "recruiter", description: "Manage candidates and applications", permissions: ["profiles:read", "profiles:create", "applications:*"], isDefault: false },
		{ name: "Candidate", slug: "candidate", description: "View and manage own data", permissions: ["own:*"], isDefault: true },
	];
	const userRoleMap = new Map<string, string>();
	for (const userRoleTemplate of defaultUserRoles) {
		const [userRole] = await db
			.insert(userRoles)
			.values({
				...userRoleTemplate,
				organisationId: org.id,
			})
			.returning();
		userRoleMap.set(userRoleTemplate.slug, userRole.id);
	}
	console.log(`   ✓ Created ${defaultUserRoles.length} user roles`);

	// 5. Create compliance elements
	const elementTemplates = config.market === "uk" ? ukComplianceElements : usComplianceElements;
	const elementMap = new Map<string, string>();
	for (const elementTemplate of elementTemplates) {
		const [element] = await db
			.insert(complianceElements)
			.values({
				...elementTemplate,
				organisationId: org.id,
			})
			.returning();
		elementMap.set(elementTemplate.slug, element.id);
	}
	console.log(`   ✓ Created ${elementTemplates.length} compliance elements`);

	// 6. Create compliance packages and link elements
	const packageTemplates = config.market === "uk" ? ukPackageTemplates : usPackageTemplates;
	const packageContents = config.market === "uk" ? ukPackageContents : usPackageContents;
	const packageMap = new Map<string, string>();

	for (const packageTemplate of packageTemplates) {
		const [pkg] = await db
			.insert(compliancePackages)
			.values({
				...packageTemplate,
				organisationId: org.id,
			})
			.returning();
		packageMap.set(packageTemplate.slug, pkg.id);

		// Link elements to package
		const elementSlugs = packageContents[packageTemplate.slug] || [];
		for (let i = 0; i < elementSlugs.length; i++) {
			const elementId = elementMap.get(elementSlugs[i]);
			if (elementId) {
				await db.insert(packageElements).values({
					packageId: pkg.id,
					elementId,
					isRequired: true,
					displayOrder: i,
				});
			}
		}
	}
	console.log(`   ✓ Created ${packageTemplates.length} compliance packages`);

	// 7. Create pipeline
	const [pipeline] = await db
		.insert(pipelines)
		.values({
			organisationId: org.id,
			name: "Onboarding Pipeline",
			appliesTo: "profile",
			isDefault: true,
		})
		.returning();

	const stageNames = ["New", "Documents", "Verification", "Ready", "Active"];
	const stageMap = new Map<string, string>();
	for (let i = 0; i < stageNames.length; i++) {
		const [stage] = await db
			.insert(pipelineStages)
			.values({
				pipelineId: pipeline.id,
				name: stageNames[i],
				stageOrder: i,
				isTerminal: i === stageNames.length - 1,
			})
			.returning();
		stageMap.set(stageNames[i], stage.id);
	}
	console.log(`   ✓ Created onboarding pipeline with ${stageNames.length} stages`);

	// 8. Create candidates with evidence and activities
	let userCount = 0;
	let profileCount = 0;
	let evidenceCount = 0;
	let activityCount = 0;
	let taskCount = 0;
	let referenceContactCount = 0;

	for (const candidateConfig of config.candidates) {
		// Create User (global identity)
		const [user] = await db
			.insert(users)
			.values({
				authUserId: null, // Seeded users don't have Supabase auth
				email: candidateConfig.profile.email,
				firstName: candidateConfig.profile.firstName,
				lastName: candidateConfig.profile.lastName,
				phone: candidateConfig.profile.phone,
				currentOrgId: org.id,
			})
			.returning();
		userCount++;

		// Create Profile (compliance data)
		// Set createdAt in the past to simulate realistic onboarding duration
		const onboardingDays = candidateConfig.state.status === "compliant"
			? randomInt(30, 60) // Compliant candidates have been around longer
			: candidateConfig.state.status === "stuck"
				? randomInt(14, 30) // Stuck candidates have been waiting
				: randomInt(5, 20); // Others are more recent

		const [profile] = await db
			.insert(profiles)
			.values({
				...candidateConfig.profile,
				organisationId: org.id,
				createdAt: daysFromNow(-onboardingDays),
			})
			.returning();
		profileCount++;

		// Create OrgMembership (links user to org with role and profile)
		await db
			.insert(orgMemberships)
			.values({
				userId: user.id,
				organisationId: org.id,
				userRoleId: userRoleMap.get("candidate")!,
				profileId: profile.id,
				status: "active",
				joinedAt: new Date(),
			});

		// Determine pipeline stage based on status
		let stageName: string;
		switch (candidateConfig.state.status) {
			case "compliant":
				stageName = "Active";
				break;
			case "near_complete":
			case "expiring":
				stageName = "Verification";
				break;
			case "in_progress":
				stageName = "Documents";
				break;
			case "stuck":
			case "non_compliant":
				stageName = "Documents";
				break;
			default:
				stageName = "New";
		}

		await db.insert(entityStagePositions).values({
			entityType: "profile",
			entityId: profile.id,
			pipelineId: pipeline.id,
			currentStageId: stageMap.get(stageName)!,
			enteredStageAt: daysFromNow(-randomInt(1, 14)),
		});

		// Create placement for compliant/near-complete candidates
		// FA demo candidates get special-cased below with specific work nodes and deal types
		const faDemoPlacements: Record<string, {
			workNodeName: string;
			roleSlug: string;
			status: "pending" | "onboarding" | "compliance" | "ready" | "active" | "completed" | "cancelled";
			dealType: "standard" | "lapse" | "reassignment";
			compliancePercentage: number;
			startDateDays?: number;
		}> = {
			"ashlyn.torres@email.com": {
				workNodeName: "Memorial Hospital Jacksonville",
				roleSlug: "travel-icu-rn",
				status: "onboarding",
				dealType: "standard",
				compliancePercentage: 45,
				startDateDays: 28,
			},
			"lexie.chen@email.com": {
				workNodeName: "UCLA Medical Center",
				roleSlug: "travel-rn",
				status: "compliance",
				dealType: "reassignment",
				compliancePercentage: 78,
				startDateDays: 21,
			},
			"peter.walsh@email.com": {
				workNodeName: "Baptist Health Miami",
				roleSlug: "travel-rn",
				status: "compliance",
				dealType: "lapse",
				compliancePercentage: 25,
				startDateDays: 35,
			},
		};

		const faPlacement = faDemoPlacements[candidateConfig.profile.email];
		let placementId: string | null = null;

		if (faPlacement) {
			// FA demo candidate — create placement with specific work node and deal type
			const workNodeId = nodeMap.get(faPlacement.workNodeName);
			const roleId = roleMap.get(faPlacement.roleSlug);

			if (workNodeId && roleId) {
				const [pl] = await db.insert(placements).values({
					organisationId: org.id,
					profileId: profile.id,
					workNodeId,
					roleId,
					status: faPlacement.status,
					compliancePercentage: faPlacement.compliancePercentage,
					isCompliant: false,
					startDate: faPlacement.startDateDays
						? daysFromNow(faPlacement.startDateDays)
						: null,
					customFields: { dealType: faPlacement.dealType },
				}).returning();
				placementId = pl.id;
			}
		} else if (["compliant", "near_complete", "expiring"].includes(candidateConfig.state.status)) {
			const workNodeNames = config.workNodes.filter(n => n.parent).map(n => n.name);
			const randomWorkNode = randomPick(workNodeNames);
			const workNodeId = nodeMap.get(randomWorkNode);
			const roleId = roleMap.get(candidateConfig.roleSlug);

			if (workNodeId && roleId) {
				const [pl] = await db.insert(placements).values({
					organisationId: org.id,
					profileId: profile.id,
					workNodeId,
					roleId,
					status: candidateConfig.state.status === "compliant" ? "active" : "compliance",
					compliancePercentage: candidateConfig.state.status === "compliant" ? 100 : randomInt(70, 95),
					isCompliant: candidateConfig.state.status === "compliant",
					startDate: candidateConfig.state.startDateDays
						? daysFromNow(candidateConfig.state.startDateDays)
						: daysFromNow(-randomInt(1, 90)),
				}).returning();
				placementId = pl.id;
			}
		}

		// Create evidence for elements NOT in missing list
		const allElements = config.market === "uk" ? ukComplianceElements : usComplianceElements;
		const missingSet = new Set(candidateConfig.state.missingElements || []);
		const expiringSet = new Set(candidateConfig.state.expiringElements || []);
		const pendingAdminSet = new Set(candidateConfig.state.pendingAdminReview || []);
		const pendingThirdPartySet = new Set(candidateConfig.state.pendingThirdParty || []);

		for (const element of allElements) {
			if (element.scope === "placement") continue; // Skip placement-scoped for now
			if (missingSet.has(element.slug)) continue; // Missing = no evidence

			const elementId = elementMap.get(element.slug);
			if (!elementId) continue;

			// Determine status and source based on blocking state
			let status: "pending" | "processing" | "requires_review" | "approved" | "rejected" | "expired" = "approved";
			let source: "user_upload" | "cv_extraction" | "document_extraction" | "external_check" | "ai_extraction" | "admin_entry" | "attestation" = randomPick(["user_upload", "admin_entry"]);
			let verificationStatus: "unverified" | "auto_verified" | "human_verified" | "external_verified" = "human_verified";
			let verifiedAt: Date | null = daysFromNow(-randomInt(1, 30));

			if (pendingAdminSet.has(element.slug)) {
				// Waiting on admin review - document uploaded but not yet approved
				status = "requires_review";
				source = "user_upload";
				verificationStatus = "unverified";
				verifiedAt = null;
			} else if (pendingThirdPartySet.has(element.slug)) {
				// Waiting on third party - external check in progress
				status = "pending";
				source = "external_check";
				verificationStatus = "unverified";
				verifiedAt = null;
			} else if (expiringSet.has(element.slug) && candidateConfig.state.status === "non_compliant") {
				// Already expired
				status = "expired";
			}

			// Calculate expiry
			let expiresAt: Date | null = null;
			if (element.expiryDays) {
				if (expiringSet.has(element.slug)) {
					if (candidateConfig.state.status === "non_compliant") {
						// Already expired
						expiresAt = daysFromNow(-randomInt(1, 5));
					} else {
						// Expiring soon
						expiresAt = daysFromNow(randomInt(5, 20));
					}
				} else {
					// Normal expiry in the future
					expiresAt = daysFromNow(randomInt(60, element.expiryDays - 30));
				}
			}

			await db.insert(evidence).values({
				organisationId: org.id,
				complianceElementId: elementId,
				profileId: profile.id,
				evidenceType: element.evidenceType,
				source,
				status,
				verificationStatus,
				dataOwnership: "organisation",
				issuedAt: daysFromNow(-randomInt(30, 365)),
				expiresAt,
				verifiedAt,
			});
			evidenceCount++;
		}

		// Create activities based on state
		const activityDays = candidateConfig.state.daysSinceActivity || 0;

		// Welcome activity (oldest)
		await db.insert(activities).values({
			organisationId: org.id,
			profileId: profile.id,
			activityType: "message_sent",
			actor: "ai",
			channel: "email",
			summary: `Sent welcome email to ${profile.firstName}`,
			details: { template: "welcome", subject: "Welcome to your onboarding journey" },
			createdAt: daysFromNow(-randomInt(30, 60)),
		});
		activityCount++;

		// Recent activity based on state
		if (candidateConfig.state.status === "stuck") {
			await db.insert(activities).values({
				organisationId: org.id,
				profileId: profile.id,
				activityType: "message_sent",
				actor: "ai",
				channel: "email",
				summary: `Sent reminder for outstanding documents`,
				details: { template: "document_reminder", attempt: 3 },
				createdAt: daysFromNow(-activityDays),
			});
			activityCount++;

			// Create escalation
			await db.insert(escalations).values({
				organisationId: org.id,
				profileId: profile.id,
				escalationType: "candidate_request",
				status: "pending",
				priority: "high",
				question: `${profile.firstName} ${profile.lastName} has not responded to multiple outreach attempts. Manual follow-up required.`,
				aiReasoning: "Candidate has not responded to 3 automated reminders over 14 days.",
				aiRecommendation: "Recommend phone call or alternative contact method.",
				dueAt: daysFromNow(2),
				createdAt: daysFromNow(-1),
			});
		} else if (candidateConfig.state.status === "near_complete") {
			const missing = candidateConfig.state.missingElements?.[0] || "documents";
			await db.insert(activities).values({
				organisationId: org.id,
				profileId: profile.id,
				activityType: "message_sent",
				actor: "ai",
				channel: "email",
				summary: `Sent reminder for ${missing}`,
				details: { template: "document_reminder", element: missing },
				createdAt: daysFromNow(-activityDays),
			});
			activityCount++;
		} else if (candidateConfig.state.status === "expiring") {
			const expiring = candidateConfig.state.expiringElements?.[0] || "document";
			await db.insert(activities).values({
				organisationId: org.id,
				profileId: profile.id,
				activityType: "message_sent",
				actor: "ai",
				channel: "email",
				summary: `Sent expiry warning for ${expiring}`,
				details: { template: "expiry_warning", element: expiring, daysRemaining: randomInt(7, 20) },
				createdAt: daysFromNow(-activityDays),
			});
			activityCount++;
		}

		// Document upload activity for in-progress candidates
		if (candidateConfig.state.status === "in_progress") {
			await db.insert(activities).values({
				organisationId: org.id,
				profileId: profile.id,
				activityType: "document_uploaded",
				actor: "candidate",
				channel: "portal",
				summary: `${profile.firstName} uploaded passport`,
				details: { documentType: "passport" },
				createdAt: daysFromNow(-randomInt(1, 7)),
			});
			activityCount++;
		}

		// Generate realistic activity history with bursts showing quick turnarounds
		// This demonstrates the speed of the onboarding process

		// Helper to create a timestamp with specific hours/minutes offset from a base date
		const createTimestamp = (daysAgo: number, hours: number, minutes: number) => {
			const date = new Date();
			date.setDate(date.getDate() - daysAgo);
			date.setHours(hours, minutes, randomInt(0, 59), 0);
			return date;
		};

		// Activity burst templates - sequences that happen in quick succession
		const activityBursts = [
			// Document upload -> AI processing -> Admin review burst
			[
				{ type: "document_uploaded", actor: "candidate", channel: "portal", summary: `${profile.firstName} uploaded passport`, offsetMins: 0 },
				{ type: "system_action", actor: "ai", channel: "api", summary: `AI extracted data from ${profile.firstName}'s passport`, offsetMins: 1 },
				{ type: "document_reviewed", actor: "ai", channel: "portal", summary: `AI verified ${profile.firstName}'s passport authenticity`, offsetMins: 2 },
				{ type: "status_changed", actor: "ai", channel: "portal", summary: `${profile.firstName}'s ID verification complete`, offsetMins: 3 },
			],
			// Reference request flow
			[
				{ type: "message_sent", actor: "ai", channel: "email", summary: `Reference request sent for ${profile.firstName}`, offsetMins: 0 },
				{ type: "system_action", actor: "system", channel: "api", summary: `Reference portal link generated`, offsetMins: 1 },
			],
			// Reference response burst
			[
				{ type: "check_completed", actor: "integration", channel: "api", summary: `Reference received for ${profile.firstName}`, offsetMins: 0 },
				{ type: "system_action", actor: "ai", channel: "api", summary: `AI analysed reference content`, offsetMins: 2 },
				{ type: "status_changed", actor: "ai", channel: "portal", summary: `Reference verified for ${profile.firstName}`, offsetMins: 3 },
			],
			// DBS check flow
			[
				{ type: "check_initiated", actor: "system", channel: "api", summary: `DBS check initiated for ${profile.firstName}`, offsetMins: 0 },
				{ type: "message_sent", actor: "ai", channel: "email", summary: `DBS application link sent to ${profile.firstName}`, offsetMins: 1 },
			],
			// Candidate engagement burst
			[
				{ type: "message_sent", actor: "ai", channel: "sms", summary: `SMS reminder sent to ${profile.firstName}`, offsetMins: 0 },
				{ type: "message_received", actor: "candidate", channel: "portal", summary: `${profile.firstName} logged into portal`, offsetMins: 15 },
				{ type: "document_uploaded", actor: "candidate", channel: "portal", summary: `${profile.firstName} uploaded proof of address`, offsetMins: 22 },
				{ type: "system_action", actor: "ai", channel: "api", summary: `AI verified address document`, offsetMins: 23 },
			],
			// Admin review burst
			[
				{ type: "note_added", actor: "admin", channel: "portal", summary: `Admin reviewed ${profile.firstName}'s application`, offsetMins: 0 },
				{ type: "status_changed", actor: "admin", channel: "portal", summary: `${profile.firstName} moved to final checks`, offsetMins: 5 },
			],
			// Quick AI chase sequence
			[
				{ type: "system_action", actor: "ai", channel: "api", summary: `AI detected missing Right to Work for ${profile.firstName}`, offsetMins: 0 },
				{ type: "message_sent", actor: "ai", channel: "email", summary: `Reminder sent: Please upload Right to Work`, offsetMins: 1 },
			],
		];

		// Create single activities spread evenly across the last 14 days
		// Each activity on a different day for clear visualization
		const activityPool = [
			{ type: "document_uploaded", actor: "candidate", channel: "portal", summary: `${profile.firstName} uploaded passport` },
			{ type: "system_action", actor: "ai", channel: "api", summary: `AI verified ${profile.firstName}'s document` },
			{ type: "message_sent", actor: "ai", channel: "email", summary: `Onboarding update sent to ${profile.firstName}` },
			{ type: "check_initiated", actor: "system", channel: "api", summary: `DBS check initiated for ${profile.firstName}` },
			{ type: "message_received", actor: "candidate", channel: "portal", summary: `${profile.firstName} logged into portal` },
			{ type: "document_reviewed", actor: "admin", channel: "portal", summary: `Admin reviewed ${profile.firstName}'s documents` },
			{ type: "check_completed", actor: "integration", channel: "api", summary: `Reference received for ${profile.firstName}` },
			{ type: "status_changed", actor: "ai", channel: "portal", summary: `${profile.firstName}'s status updated` },
			{ type: "message_sent", actor: "ai", channel: "sms", summary: `SMS reminder sent to ${profile.firstName}` },
			{ type: "note_added", actor: "admin", channel: "portal", summary: `Admin added note about ${profile.firstName}` },
		];

		// Create 30-40 activities spread evenly across last 6 days (not today to avoid future)
		const numActivities = randomInt(30, 40);
		const days = [1, 2, 3, 4, 5, 6]; // daysAgo values

		// Track how many activities per day for time spacing
		const activitiesPerDay: Record<number, number> = {};
		const activityIndexPerDay: Record<number, number> = {};
		days.forEach(d => { activitiesPerDay[d] = 0; activityIndexPerDay[d] = 0; });

		// First pass: count activities per day (round-robin distribution)
		for (let i = 0; i < numActivities; i++) {
			const daysAgo = days[i % days.length];
			activitiesPerDay[daysAgo]++;
		}

		for (let i = 0; i < numActivities; i++) {
			// Round-robin across days for even distribution
			const daysAgo = days[i % days.length];

			// Space times evenly within 6am-8pm (14 hour window)
			const totalMinutes = 14 * 60; // 840 minutes
			const countForDay = activitiesPerDay[daysAgo];
			const indexForDay = activityIndexPerDay[daysAgo]++;
			const slotSize = totalMinutes / countForDay;
			const minuteOffset = Math.floor(slotSize * indexForDay + randomInt(0, Math.floor(slotSize * 0.5)));
			const hour = 6 + Math.floor(minuteOffset / 60);
			const minute = minuteOffset % 60;

			const activity = activityPool[i % activityPool.length];
			const timestamp = createTimestamp(daysAgo, hour, minute);

			await db.insert(activities).values({
				organisationId: org.id,
				profileId: profile.id,
				activityType: activity.type as typeof activities.$inferInsert["activityType"],
				actor: activity.actor as typeof activities.$inferInsert["actor"],
				channel: activity.channel as typeof activities.$inferInsert["channel"],
				summary: activity.summary,
				details: {},
				createdAt: timestamp,
			});
			activityCount++;
		}

		// Create tasks based on candidate state
		// If a placement exists, generate placement-scoped tasks from compliance state
		// Otherwise, generate profile-scoped tasks (original behaviour)
		const candidateName = `${profile.firstName} ${profile.lastName}`;

		if (placementId) {
			// --- Placement-scoped task generation ---
			const allElementsForMarket = config.market === "uk" ? ukComplianceElements : usComplianceElements;
			const elementNameMap = new Map(allElementsForMarket.map(e => [e.slug, e.name]));
			const missingElements = candidateConfig.state.missingElements || [];

			// Split missing elements into FA-handled vs non-FA
			const missingFa = missingElements.filter(slug => faHandledElements.has(slug));
			const missingNonFa = missingElements.filter(slug => !faHandledElements.has(slug));

			// FA items → ONE grouped task per placement
			if (missingFa.length > 0) {
				await db.insert(tasks).values({
					organisationId: org.id,
					subjectType: "placement",
					subjectId: placementId,
					title: `Initiate FA screening — ${missingFa.length} item${missingFa.length !== 1 ? "s" : ""} outstanding`,
					description: `Missing FA-handled items: ${missingFa.map(s => elementNameMap.get(s) || s).join(", ")}. Submit a single screening order to resolve.`,
					priority: "high",
					category: "general",
					source: "system",
					status: "pending",
					complianceElementSlugs: missingFa,
					dueAt: daysFromNow(3),
					createdAt: daysFromNow(-1),
					updatedAt: daysFromNow(-1),
				});
				taskCount++;
			}

			// Missing non-FA → individual tasks
			for (const slug of missingNonFa) {
				const itemName = elementNameMap.get(slug) || slug;
				await db.insert(tasks).values({
					organisationId: org.id,
					subjectType: "placement",
					subjectId: placementId,
					title: `Chase ${profile.firstName} for ${itemName}`,
					description: `${candidateName} is missing ${itemName}. Follow up to obtain this document.`,
					priority: candidateConfig.state.status === "stuck" ? "high" : "medium",
					category: "chase_candidate",
					source: "system",
					status: "pending",
					complianceElementSlugs: [slug],
					dueAt: candidateConfig.state.startDateDays
						? daysFromNow(Math.min(candidateConfig.state.startDateDays - 7, 14))
						: daysFromNow(7),
					createdAt: daysFromNow(-randomInt(1, 3)),
					updatedAt: daysFromNow(-1),
				});
				taskCount++;
			}

			// Expired elements → urgent tasks
			const expiredElements = (candidateConfig.state.expiringElements || []).filter(
				() => candidateConfig.state.status === "non_compliant",
			);
			for (const slug of expiredElements) {
				const itemName = elementNameMap.get(slug) || slug;
				await db.insert(tasks).values({
					organisationId: org.id,
					subjectType: "placement",
					subjectId: placementId,
					title: `Urgent: ${itemName} has expired`,
					description: `${candidateName}'s ${itemName} has expired. Immediate renewal required.`,
					priority: "urgent",
					category: "expiry",
					source: "system",
					status: "pending",
					complianceElementSlugs: [slug],
					dueAt: daysFromNow(1),
					createdAt: daysFromNow(-1),
					updatedAt: daysFromNow(-1),
				});
				taskCount++;
			}

			// Expiring elements (not yet expired) → renewal tasks
			const expiringElements = (candidateConfig.state.expiringElements || []).filter(
				() => candidateConfig.state.status !== "non_compliant",
			);
			for (const slug of expiringElements) {
				const itemName = elementNameMap.get(slug) || slug;
				await db.insert(tasks).values({
					organisationId: org.id,
					subjectType: "placement",
					subjectId: placementId,
					title: `Renew ${itemName} — expires soon`,
					description: `${candidateName}'s ${itemName} is expiring. Initiate renewal process.`,
					priority: "high",
					category: "expiry",
					source: "system",
					status: "pending",
					complianceElementSlugs: [slug],
					dueAt: daysFromNow(7),
					createdAt: daysFromNow(-3),
					updatedAt: daysFromNow(-3),
				});
				taskCount++;
			}

			// Pending admin review → review tasks
			for (const slug of (candidateConfig.state.pendingAdminReview || [])) {
				const itemName = elementNameMap.get(slug) || slug;
				await db.insert(tasks).values({
					organisationId: org.id,
					subjectType: "placement",
					subjectId: placementId,
					title: `Review ${profile.firstName}'s ${itemName}`,
					description: `${candidateName} has submitted ${itemName}. Review and verify the document.`,
					priority: "high",
					category: "review_document",
					source: "system",
					status: "pending",
					complianceElementSlugs: [slug],
					dueAt: daysFromNow(2),
					createdAt: daysFromNow(0),
					updatedAt: daysFromNow(0),
				});
				taskCount++;
			}

			// Pending third party → follow-up tasks
			for (const slug of (candidateConfig.state.pendingThirdParty || [])) {
				const itemName = elementNameMap.get(slug) || slug;
				await db.insert(tasks).values({
					organisationId: org.id,
					subjectType: "placement",
					subjectId: placementId,
					title: `Follow up on ${itemName}`,
					description: `External verification in progress for ${candidateName}'s ${itemName}. Chase provider if overdue.`,
					priority: "medium",
					category: "follow_up",
					source: "system",
					status: "pending",
					complianceElementSlugs: [slug],
					dueAt: daysFromNow(5),
					createdAt: daysFromNow(-2),
					updatedAt: daysFromNow(-2),
				});
				taskCount++;
			}
		} else {
			// --- Profile-scoped tasks (no placement) ---
			if (candidateConfig.state.status === "stuck") {
				await db.insert(tasks).values({
					organisationId: org.id,
					subjectType: "profile",
					subjectId: profile.id,
					title: `Chase ${candidateName} for outstanding documents`,
					description: `Candidate has not responded to multiple automated reminders. Manual follow-up required.`,
					priority: "urgent",
					category: "chase_candidate",
					source: "ai_agent",
					agentId: "onboarding-companion",
					aiReasoning: "Candidate has not responded to 3 automated reminders over 14 days.",
					status: "pending",
					dueAt: daysFromNow(1),
					createdAt: daysFromNow(-1),
					updatedAt: daysFromNow(-1),
				});
				taskCount++;
			} else if (candidateConfig.state.status === "near_complete") {
				const missing = candidateConfig.state.missingElements?.[0] || "Right to Work";
				await db.insert(tasks).values({
					organisationId: org.id,
					subjectType: "profile",
					subjectId: profile.id,
					title: `Review uploaded ${missing} document`,
					description: `${profile.firstName} has uploaded their ${missing}. Please review and verify.`,
					priority: "high",
					category: "review_document",
					source: "ai_agent",
					agentId: "document-processor",
					aiReasoning: "Document uploaded and awaiting manual verification.",
					status: "pending",
					dueAt: daysFromNow(2),
					createdAt: daysFromNow(0),
					updatedAt: daysFromNow(0),
				});
				taskCount++;
			} else if (candidateConfig.state.status === "expiring") {
				const expiring = candidateConfig.state.expiringElements?.[0] || "DBS";
				await db.insert(tasks).values({
					organisationId: org.id,
					subjectType: "profile",
					subjectId: profile.id,
					title: `Renew expiring ${expiring} for ${candidateName}`,
					description: `${expiring} certificate expires soon. Initiate renewal process.`,
					priority: "high",
					category: "expiry",
					source: "system",
					aiReasoning: `${expiring} expires within 30 days.`,
					status: "pending",
					dueAt: daysFromNow(7),
					createdAt: daysFromNow(-3),
					updatedAt: daysFromNow(-3),
				});
				taskCount++;
			} else if (candidateConfig.state.status === "in_progress") {
				await db.insert(tasks).values({
					organisationId: org.id,
					subjectType: "profile",
					subjectId: profile.id,
					title: `Follow up on ${profile.firstName}'s reference request`,
					description: `Reference request sent to previous employer. Follow up if no response within 5 days.`,
					priority: "medium",
					category: "follow_up",
					source: "ai_agent",
					agentId: "reference-chaser",
					aiReasoning: "Reference request pending for 3 days.",
					status: "in_progress",
					dueAt: daysFromNow(5),
					createdAt: daysFromNow(-3),
					updatedAt: daysFromNow(-1),
				});
				taskCount++;
			}
		}

		// Create reference contacts if defined
		if (candidateConfig.referenceContacts) {
			for (const ref of candidateConfig.referenceContacts) {
				await db.insert(referenceContacts).values({
					profileId: profile.id,
					organisationId: org.id,
					refereeName: ref.refereeName,
					refereeEmail: ref.refereeEmail,
					refereePhone: ref.refereePhone,
					refereeJobTitle: ref.refereeJobTitle,
					refereeOrganisation: ref.refereeOrganisation,
					relationship: ref.relationship,
					candidateJobTitle: ref.candidateJobTitle,
					candidateStartDate: ref.candidateStartDate,
					candidateEndDate: ref.candidateEndDate,
					status: "pending",
				});
				referenceContactCount++;
			}
		}
	}

	console.log(`   ✓ Created ${userCount} users`);
	console.log(`   ✓ Created ${profileCount} profiles`);
	console.log(`   ✓ Created ${evidenceCount} evidence records`);
	console.log(`   ✓ Created ${activityCount} activities`);
	console.log(`   ✓ Created ${taskCount} tasks`);
	console.log(`   ✓ Created ${referenceContactCount} reference contacts`);

	return org;
}

// ============================================
// Main Entry Point
// ============================================

async function assignAdmins() {
	console.log(`\n👑 Assigning admin roles to real users...`);

	// Find all real users (those with authUserId = signed up via Supabase Auth)
	const realUsers = await db
		.select()
		.from(users)
		.where(isNotNull(users.authUserId));

	if (realUsers.length === 0) {
		console.log(`   ℹ No real users found`);
		return;
	}

	// Get all organisations
	const allOrgs = await db.select().from(organisations);

	for (const user of realUsers) {
		for (const org of allOrgs) {
			// Find admin role for this org (should exist from seeding)
			const [adminRole] = await db
				.select()
				.from(userRoles)
				.where(and(
					eq(userRoles.organisationId, org.id),
					eq(userRoles.slug, "admin")
				))
				.limit(1);

			if (!adminRole) {
				console.log(`   ⚠ No admin role found for org ${org.name}`);
				continue;
			}

			// Check if membership exists
			const [existingMembership] = await db
				.select()
				.from(orgMemberships)
				.where(and(
					eq(orgMemberships.userId, user.id),
					eq(orgMemberships.organisationId, org.id)
				))
				.limit(1);

			if (!existingMembership) {
				// Create membership with admin role
				await db
					.insert(orgMemberships)
					.values({
						userId: user.id,
						organisationId: org.id,
						userRoleId: adminRole.id,
						status: "active",
						joinedAt: new Date(),
					});
			}
		}

		console.log(`   ✓ ${user.email} is admin on ${allOrgs.length} orgs`);
	}
}

async function main() {
	console.log("🌱 Starting seed...\n");

	const start = Date.now();

	try {
		// Seed each organisation (upsert + clear + reseed)
		for (const config of orgConfigs) {
			await seedOrganisation(config);
		}

		// Assign admin roles to configured users
		await assignAdmins();

		const duration = Date.now() - start;
		console.log(`\n✅ Seed completed in ${duration}ms`);
	} catch (error) {
		console.error("\n❌ Seed failed:", error);
		throw error;
	} finally {
		await closeConnection();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
