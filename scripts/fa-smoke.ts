// scripts/fa-smoke.ts
// Usage: pnpm fa:smoke          (mock mode)
//        pnpm fa:smoke --live   (live API -- be careful)

import { getFAClient } from "../lib/api/first-advantage/client";
import { selectFAPackage } from "../lib/api/first-advantage/package-selector";

async function smoke() {
	const isLive = process.argv.includes("--live");
	if (isLive) {
		process.env.FA_API_MODE = "live";
		console.log("WARNING: Running against LIVE FA API");
	} else {
		process.env.FA_API_MODE = "mock";
		console.log("Running against mock FA client");
	}

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
	assert(peter.tier === 2, `Peter should get Package #2, got tier ${peter.tier}`);
	console.log(`Peter (lapse FL): Tier ${peter.tier} -- ${peter.reason}`);

	const lexie = selectFAPackage({ targetState: "california", dealType: "reassignment" });
	assert(lexie.tier === 2, `Lexie should get Package #2 (CA statewide), got tier ${lexie.tier}`);
	console.log(`Lexie (reassignment CA): Tier ${lexie.tier} -- ${lexie.reason}`);

	// 4. Create + screen flow (mock only for full flow)
	if (!isLive) {
		console.log("\n--- Screening Flow (mock) ---");
		const candidate = await client.createCandidate({
			givenName: "Test",
			familyName: "Smoke",
			email: "test@smoke.com",
			clientReferenceId: "smoke-test-1",
			dob: "1992-03-15",
			ssn: "555-00-1234",
			address: {
				addressLine: "456 Test Ave",
				municipality: "Jacksonville",
				regionCode: "US-FL",
				postalCode: "32099",
				countryCode: "US",
			},
		});
		console.log(`Candidate created: ${candidate.id}`);

		const screening = await client.initiateScreening({
			candidateId: candidate.id,
			packageId: ashlyn.packageId,
		});
		console.log(`Screening initiated: ${screening.id}, status: ${screening.status}`);
		console.log(`  ${screening.reportItems.length} report items`);

		// Wait for mock progression (mock completes after 15s)
		await new Promise((r) => setTimeout(r, 16_000));
		const result = await client.getScreening(screening.id);
		assert(result.status === "Complete", `Expected Complete, got ${result.status}`);
		console.log(`Screening complete: ${result.result}`);
	}

	console.log("\nAll smoke checks passed");
}

function assert(condition: boolean, message: string) {
	if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

smoke().catch((e) => {
	console.error("Smoke check failed:", e.message);
	process.exit(1);
});
