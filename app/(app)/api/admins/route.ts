import { auth } from "@/lib/auth";
import { mockAdmins, searchAdmins, type AdminUser } from "@/lib/data/mock-admins";

function getInitials(firstName: string, lastName: string): string {
	return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * GET /api/admins
 *
 * Returns list of admin users for @ mention autocomplete.
 * Includes "me" as first option for self-assignment.
 * Supports optional ?q= query parameter for filtering.
 */
export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const query = searchParams.get("q");

	const session = await auth();

	// Create "me" entry for current user
	const meEntry: AdminUser | null = session?.user
		? {
				id: session.user.id,
				firstName: "me",
				lastName: "",
				initials: getInitials(session.user.firstName, session.user.lastName),
				role: session.user.roleName ?? "Team Member",
				email: session.user.email,
			}
		: null;

	let admins = query ? searchAdmins(query) : mockAdmins;

	// Add "me" at the top if it matches the query (or no query)
	if (meEntry) {
		const meMatches =
			!query ||
			"me".includes(query.toLowerCase()) ||
			session?.user.firstName.toLowerCase().includes(query.toLowerCase());

		if (meMatches) {
			admins = [meEntry, ...admins];
		}
	}

	return Response.json({ admins });
}
