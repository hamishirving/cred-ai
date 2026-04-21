// scripts/diag-satisfaction.ts
// Usage: npx tsx scripts/diag-satisfaction.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import {
	assignmentRules,
	compliancePackages,
	complianceElements,
	organisations,
	placements,
	profiles,
	workNodes,
} from "../lib/db/schema";

const client = postgres(process.env.DATABASE_URL || process.env.POSTGRES_URL!);
const db = drizzle(client);

function verdict(label: string, ok: boolean, detail?: string) {
	console.log(`${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
	// Find TravelNurse Pro org
	const [org] = await db
		.select()
		.from(organisations)
		.where(eq(organisations.slug, "travelnurse-pro"));
	if (!org) {
		console.log("❌ TravelNurse Pro org not found — did US seed run?");
		process.exit(1);
	}
	console.log(`\nOrg: ${org.name} (${org.id})\n`);

	// 1. mmr-immunity element with satisfaction_logic
	const [mmr] = await db
		.select()
		.from(complianceElements)
		.where(
			and(
				eq(complianceElements.organisationId, org.id),
				eq(complianceElements.slug, "mmr-immunity"),
			),
		);
	verdict(
		"compliance_elements row 'mmr-immunity' exists",
		!!mmr,
		mmr ? `id=${mmr.id}` : undefined,
	);
	if (mmr) {
		verdict(
			"  satisfaction_logic populated",
			!!mmr.satisfactionLogic,
			mmr.satisfactionLogic
				? `op=${(mmr.satisfactionLogic as any).op}, children=${(mmr.satisfactionLogic as any).children?.length ?? 0}`
				: "null",
		);
	}

	// 2. trinity-health-facility-layer package
	const [pkg] = await db
		.select()
		.from(compliancePackages)
		.where(
			and(
				eq(compliancePackages.organisationId, org.id),
				eq(compliancePackages.slug, "trinity-health-facility-layer"),
			),
		);
	verdict(
		"compliance_packages row 'trinity-health-facility-layer' exists",
		!!pkg,
		pkg ? `id=${pkg.id}, active=${pkg.isActive}` : undefined,
	);

	// 3. Trinity Health work node
	const [trinity] = await db
		.select()
		.from(workNodes)
		.where(
			and(
				eq(workNodes.organisationId, org.id),
				eq(workNodes.name, "Trinity Health"),
			),
		);
	verdict(
		"work_nodes row 'Trinity Health' exists",
		!!trinity,
		trinity ? `id=${trinity.id}` : undefined,
	);

	const [dallas] = await db
		.select()
		.from(workNodes)
		.where(
			and(
				eq(workNodes.organisationId, org.id),
				eq(workNodes.name, "Trinity Health Dallas"),
			),
		);
	verdict(
		"work_nodes row 'Trinity Health Dallas' exists",
		!!dallas,
		dallas ? `id=${dallas.id}, parent=${dallas.parentId}` : undefined,
	);
	if (dallas && trinity) {
		verdict(
			"  parentId points at Trinity Health",
			dallas.parentId === trinity.id,
		);
	}

	// 4. Assignment rule pinning the package to Trinity Health
	const rules = await db
		.select()
		.from(assignmentRules)
		.where(eq(assignmentRules.organisationId, org.id));
	const trinityRule = rules.find(
		(r) => r.packageId === pkg?.id && r.specificWorkNodeId === trinity?.id,
	);
	verdict(
		"assignment_rules row for package+Trinity exists",
		!!trinityRule,
		trinityRule
			? `name="${trinityRule.name}", active=${trinityRule.isActive}`
			: `total rules in org: ${rules.length}`,
	);

	// 5. Natasha's placement workNodeId
	const [natasha] = await db
		.select({
			placementId: placements.id,
			workNodeId: placements.workNodeId,
			email: profiles.email,
		})
		.from(placements)
		.innerJoin(profiles, eq(profiles.id, placements.profileId))
		.where(
			and(
				eq(placements.organisationId, org.id),
				eq(profiles.email, "natasha.smith@email.com"),
			),
		);
	verdict(
		"Natasha placement exists",
		!!natasha,
		natasha ? `placement=${natasha.placementId}` : undefined,
	);
	if (natasha && dallas) {
		verdict(
			"  placement.work_node_id = Trinity Health Dallas",
			natasha.workNodeId === dallas.id,
			`placement has ${natasha.workNodeId}, Dallas is ${dallas.id}`,
		);
	}

	console.log("\nDone.");
	process.exit(0);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
