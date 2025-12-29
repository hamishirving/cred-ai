/**
 * Main Seed Script
 *
 * Seeds the database with multi-market demo data.
 * Run with: pnpm db:seed
 */
import { db, closeConnection } from "./db";
import { clearAllData } from "./clear";
import {
	organisations,
	workNodeTypes,
	workNodes,
	roles,
	userRoles,
	complianceElements,
	compliancePackages,
	packageElements,
	profiles,
	placements,
	evidence,
	pipelines,
	pipelineStages,
	entityStagePositions,
	activities,
	escalations,
	escalationOptions,
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
import { daysFromNow, slugify, randomPick, randomInt, atTime } from "./utils";

// ============================================
// Organisation Configurations
// ============================================

interface OrgConfig {
	name: string;
	slug: string;
	market: "uk" | "us";
	type: "agency" | "direct";
	workNodeTypes: { name: string; level: number }[];
	workNodes: { name: string; type: string; parent?: string; jurisdiction?: string }[];
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
			{ name: "City Hospital", type: "Hospital", parent: "NHS Trust North", jurisdiction: "england" },
			{ name: "A&E", type: "Ward", parent: "City Hospital", jurisdiction: "england" },
			{ name: "ICU", type: "Ward", parent: "City Hospital", jurisdiction: "england" },
			{ name: "Medical Ward", type: "Ward", parent: "City Hospital", jurisdiction: "england" },
			{ name: "Community Hospital", type: "Hospital", parent: "NHS Trust North", jurisdiction: "england" },
			{ name: "NHS Trust South", type: "NHS Trust", jurisdiction: "england" },
			{ name: "General Hospital", type: "Hospital", parent: "NHS Trust South", jurisdiction: "england" },
			{ name: "Private Care Group", type: "Care Group", jurisdiction: "england" },
			{ name: "Sunrise Care Home", type: "Care Home", parent: "Private Care Group", jurisdiction: "england" },
			{ name: "Oak Lodge Care Home", type: "Care Home", parent: "Private Care Group", jurisdiction: "england" },
		],
		candidates: meridianCandidates,
	},
	{
		name: "Oakwood Care",
		slug: "oakwood-care",
		market: "uk",
		type: "direct",
		workNodeTypes: [
			{ name: "Region", level: 0 },
			{ name: "Branch", level: 1 },
		],
		workNodes: [
			{ name: "England North", type: "Region", jurisdiction: "england" },
			{ name: "Manchester Branch", type: "Branch", parent: "England North", jurisdiction: "england" },
			{ name: "Leeds Branch", type: "Branch", parent: "England North", jurisdiction: "england" },
			{ name: "England South", type: "Region", jurisdiction: "england" },
			{ name: "London Branch", type: "Branch", parent: "England South", jurisdiction: "england" },
			{ name: "Bristol Branch", type: "Branch", parent: "England South", jurisdiction: "england" },
			{ name: "Scotland", type: "Region", jurisdiction: "scotland" },
			{ name: "Edinburgh Branch", type: "Branch", parent: "Scotland", jurisdiction: "scotland" },
			{ name: "Glasgow Branch", type: "Branch", parent: "Scotland", jurisdiction: "scotland" },
		],
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
			{ name: "UCLA Medical Center", type: "Hospital", parent: "California", jurisdiction: "california" },
			{ name: "Emergency Dept", type: "Unit", parent: "UCLA Medical Center", jurisdiction: "california" },
			{ name: "ICU", type: "Unit", parent: "UCLA Medical Center", jurisdiction: "california" },
			{ name: "Cedars-Sinai", type: "Hospital", parent: "California", jurisdiction: "california" },
			{ name: "Texas", type: "State", jurisdiction: "texas" },
			{ name: "Houston Methodist", type: "Hospital", parent: "Texas", jurisdiction: "texas" },
			{ name: "UT Southwestern", type: "Hospital", parent: "Texas", jurisdiction: "texas" },
			{ name: "Florida", type: "State", jurisdiction: "florida" },
			{ name: "Tampa General", type: "Hospital", parent: "Florida", jurisdiction: "florida" },
			{ name: "Baptist Health Miami", type: "Hospital", parent: "Florida", jurisdiction: "florida" },
		],
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
			{ name: "Lakeside Medical Center", type: "Facility", jurisdiction: "texas" },
			{ name: "Emergency Services", type: "Department", parent: "Lakeside Medical Center", jurisdiction: "texas" },
			{ name: "Surgical Services", type: "Department", parent: "Lakeside Medical Center", jurisdiction: "texas" },
			{ name: "Critical Care", type: "Department", parent: "Lakeside Medical Center", jurisdiction: "texas" },
			{ name: "Medical/Surgical Units", type: "Department", parent: "Lakeside Medical Center", jurisdiction: "texas" },
			{ name: "Lakeside Community Hospital", type: "Facility", jurisdiction: "texas" },
			{ name: "General Care", type: "Department", parent: "Lakeside Community Hospital", jurisdiction: "texas" },
			{ name: "Lakeside Clinics", type: "Facility", jurisdiction: "texas" },
			{ name: "Downtown Clinic", type: "Department", parent: "Lakeside Clinics", jurisdiction: "texas" },
			{ name: "Suburban Clinic", type: "Department", parent: "Lakeside Clinics", jurisdiction: "texas" },
		],
		candidates: lakesideCandidates,
	},
];

// ============================================
// Seeding Functions
// ============================================

async function seedOrganisation(config: OrgConfig) {
	console.log(`\n📦 Seeding ${config.name}...`);

	// 1. Create organisation
	const [org] = await db
		.insert(organisations)
		.values({
			name: config.name,
			slug: config.slug,
			settings: {
				defaultDataOwnership: "organisation",
				terminology: config.market === "uk"
					? { candidate: "Candidate", placement: "Booking" }
					: { candidate: "Traveler", placement: "Assignment" },
			},
		})
		.returning();

	console.log(`   ✓ Created organisation: ${org.name}`);

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
	let profileCount = 0;
	let evidenceCount = 0;
	let activityCount = 0;

	for (const candidateConfig of config.candidates) {
		const [profile] = await db
			.insert(profiles)
			.values({
				...candidateConfig.profile,
				organisationId: org.id,
				userRoleId: userRoleMap.get("candidate"), // All seeded profiles are candidates
			})
			.returning();
		profileCount++;

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
		if (["compliant", "near_complete", "expiring"].includes(candidateConfig.state.status)) {
			const workNodeNames = config.workNodes.filter(n => n.parent).map(n => n.name);
			const randomWorkNode = randomPick(workNodeNames);
			const workNodeId = nodeMap.get(randomWorkNode);
			const roleId = roleMap.get(candidateConfig.roleSlug);

			if (workNodeId && roleId) {
				await db.insert(placements).values({
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
				});
			}
		}

		// Create evidence for elements NOT in missing list
		const allElements = config.market === "uk" ? ukComplianceElements : usComplianceElements;
		const missingSet = new Set(candidateConfig.state.missingElements || []);
		const expiringSet = new Set(candidateConfig.state.expiringElements || []);

		for (const element of allElements) {
			if (element.scope === "placement") continue; // Skip placement-scoped for now
			if (missingSet.has(element.slug)) continue; // Missing = no evidence

			const elementId = elementMap.get(element.slug);
			if (!elementId) continue;

			// Calculate expiry
			let expiresAt: Date | null = null;
			if (element.expiryDays) {
				if (expiringSet.has(element.slug)) {
					// Expiring soon
					expiresAt = daysFromNow(randomInt(5, 20));
				} else if (candidateConfig.state.status === "non_compliant" && expiringSet.has(element.slug)) {
					// Already expired
					expiresAt = daysFromNow(-randomInt(1, 5));
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
				source: randomPick(["user_upload", "admin_entry", "external_check"]),
				status: expiringSet.has(element.slug) && candidateConfig.state.status === "non_compliant"
					? "expired"
					: "approved",
				verificationStatus: "human_verified",
				dataOwnership: "organisation",
				issuedAt: daysFromNow(-randomInt(30, 365)),
				expiresAt,
				verifiedAt: daysFromNow(-randomInt(1, 30)),
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
	}

	console.log(`   ✓ Created ${profileCount} candidates`);
	console.log(`   ✓ Created ${evidenceCount} evidence records`);
	console.log(`   ✓ Created ${activityCount} activities`);

	return org;
}

// ============================================
// Main Entry Point
// ============================================

async function main() {
	console.log("🌱 Starting seed...\n");

	const start = Date.now();

	try {
		// Clear existing data
		await clearAllData();

		// Seed each organisation
		for (const config of orgConfigs) {
			await seedOrganisation(config);
		}

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
