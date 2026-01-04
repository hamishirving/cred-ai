import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "./schema";

/**
 * Get or create a User record for a Supabase auth user.
 *
 * This is a legacy sync function that ensures a User record exists.
 * For new registrations with org/role selection, use the signup action directly.
 *
 * Returns the User record.
 */
export async function syncUserToDatabase(authUserId: string, email: string) {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error("DATABASE_URL is not defined");
	}

	const client = postgres(databaseUrl);
	const db = drizzle(client);

	try {
		// Check if user already exists
		const [existing] = await db
			.select()
			.from(users)
			.where(eq(users.authUserId, authUserId));

		if (existing) {
			return existing;
		}

		// Create minimal User record for legacy auth flow
		// Note: New registrations should use the full signup flow with org/role
		const [firstName, ...lastNameParts] = email.split("@")[0].split(".");
		const lastName = lastNameParts.join(" ") || "User";

		const [user] = await db
			.insert(users)
			.values({
				authUserId,
				email,
				firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
				lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
			})
			.returning();

		return user;
	} catch (error) {
		console.error("Failed to sync user to database:", error);
		throw error;
	} finally {
		await client.end();
	}
}
