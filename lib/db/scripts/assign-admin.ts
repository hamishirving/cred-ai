/**
 * Assigns admin role to a specific user across all organisations.
 * Creates admin role if it doesn't exist for an organisation.
 *
 * Usage: pnpm db:assign-admin
 */
import { eq, and } from "drizzle-orm";
import { db, closeConnection } from "../seed/db";
import {
	users,
	organisations,
	userRoles,
	orgMemberships,
} from "../schema";

const ADMIN_EMAIL = "hamish.irving@credentially.io";

async function main() {
	console.log(`\nAssigning admin role to: ${ADMIN_EMAIL}\n`);

	// 1. Find the user
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.email, ADMIN_EMAIL));

	if (!user) {
		console.error(`User not found: ${ADMIN_EMAIL}`);
		console.log("Make sure you've logged in at least once to create your user record.");
		await closeConnection();
		process.exit(1);
	}

	console.log(`Found user: ${user.firstName} ${user.lastName} (${user.id})`);

	// 2. Get all organisations
	const allOrgs = await db.select().from(organisations);

	if (allOrgs.length === 0) {
		console.log("No organisations found. Run pnpm db:seed first.");
		await closeConnection();
		process.exit(1);
	}

	console.log(`Found ${allOrgs.length} organisations\n`);

	let firstOrgId: string | null = null;

	// 3. For each org, ensure admin role and membership exists
	for (const org of allOrgs) {
		// Find admin role for this org
		let [adminRole] = await db
			.select()
			.from(userRoles)
			.where(
				and(
					eq(userRoles.organisationId, org.id),
					eq(userRoles.slug, "admin")
				)
			);

		// Create admin role if it doesn't exist
		if (!adminRole) {
			console.log(`  Creating admin role for ${org.name}...`);
			const [newRole] = await db
				.insert(userRoles)
				.values({
					organisationId: org.id,
					name: "Admin",
					slug: "admin",
					description: "Full system access",
					permissions: ["*"],
					isDefault: false,
					isActive: true,
				})
				.returning();
			adminRole = newRole;
		}

		if (!firstOrgId) {
			firstOrgId = org.id;
		}

		// Check if membership exists
		const [existingMembership] = await db
			.select()
			.from(orgMemberships)
			.where(
				and(
					eq(orgMemberships.userId, user.id),
					eq(orgMemberships.organisationId, org.id)
				)
			);

		if (existingMembership) {
			// Update to admin role if not already
			if (existingMembership.userRoleId !== adminRole.id) {
				await db
					.update(orgMemberships)
					.set({ userRoleId: adminRole.id, status: "active" })
					.where(eq(orgMemberships.id, existingMembership.id));
				console.log(`✓ Updated to admin: ${org.name}`);
			} else {
				console.log(`✓ Already admin: ${org.name}`);
			}
		} else {
			// Create new admin membership
			await db.insert(orgMemberships).values({
				userId: user.id,
				organisationId: org.id,
				userRoleId: adminRole.id,
				status: "active",
				joinedAt: new Date(),
			});
			console.log(`✓ Added as admin: ${org.name}`);
		}
	}

	// 4. Set current org if not set
	if (!user.currentOrgId && firstOrgId) {
		const [firstOrg] = allOrgs.filter(o => o.id === firstOrgId);
		await db
			.update(users)
			.set({ currentOrgId: firstOrgId })
			.where(eq(users.id, user.id));
		console.log(`\nSet current org to: ${firstOrg?.name}`);
	} else {
		// Show current org
		const [currentOrg] = allOrgs.filter(o => o.id === user.currentOrgId);
		if (currentOrg) {
			console.log(`\nCurrent org: ${currentOrg.name}`);
		}
	}

	console.log("\nDone! Refresh the page to see changes.");
	await closeConnection();
}

main().catch(async (err) => {
	console.error(err);
	await closeConnection();
	process.exit(1);
});
