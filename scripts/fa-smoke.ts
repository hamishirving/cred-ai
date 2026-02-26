// scripts/fa-smoke.ts
// Usage: pnpm fa:smoke   (runs against live FA API)

import { config } from "dotenv";
config({ path: ".env.local" });

import { getFAClient } from "../lib/api/first-advantage/client";
import { selectFAPackage } from "../lib/api/first-advantage/package-selector";

async function smoke() {
	console.log("Running against live FA API");

	const client = getFAClient();

	// 1. Auth
	console.log("\n--- Auth ---");
	await client.authenticate();
	console.log("Auth OK");

	// 2. Packages
	console.log("\n--- Packages ---");
	const packages = await client.getPackages();
	console.log(`${packages.length} packages retrieved`);
	for (const pkg of packages) {
		console.log(`  ${pkg.id}: ${pkg.title} (${pkg.components.length} components)`);
	}

	// 3. Package selection assertions
	console.log("\n--- Package Selection ---");
	const ashlyn = selectFAPackage({ targetState: "florida", dealType: "standard" });
	assert(ashlyn.tier === 1, `Ashlyn should get Package #1, got tier ${ashlyn.tier}`);
	console.log(`Ashlyn (standard FL): Tier ${ashlyn.tier} -- ${ashlyn.reason}`);

	const peter = selectFAPackage({ targetState: "florida", dealType: "lapse" });
	assert(peter.tier === 3, `Peter should get Package #3 (lapse = full), got tier ${peter.tier}`);
	console.log(`Peter (lapse FL): Tier ${peter.tier} -- ${peter.reason}`);

	const lexie = selectFAPackage({ targetState: "california", dealType: "reassignment" });
	assert(lexie.tier === 2, `Lexie should get Package #2 (CA statewide), got tier ${lexie.tier}`);
	console.log(`Lexie (reassignment CA): Tier ${lexie.tier} -- ${lexie.reason}`);

	console.log("\nAll smoke checks passed");
}

function assert(condition: boolean, message: string) {
	if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

smoke().catch((e) => {
	console.error("Smoke check failed:", e.message);
	process.exit(1);
});
