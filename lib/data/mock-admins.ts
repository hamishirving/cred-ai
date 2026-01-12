/**
 * Mock admin users for @ mention autocomplete.
 *
 * These represent staff members who can be assigned tasks.
 * In production, this would come from users + org_memberships.
 */

export interface AdminUser {
	id: string;
	firstName: string;
	lastName: string;
	initials: string;
	role: string;
	email: string;
}

/**
 * Mock admin users for demo purposes.
 * 6 admins with realistic names and roles.
 * IDs are valid UUIDs for database compatibility.
 */
export const mockAdmins: AdminUser[] = [
	{
		id: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
		firstName: "Sarah",
		lastName: "Chen",
		initials: "SC",
		role: "Compliance Manager",
		email: "sarah.chen@example.com",
	},
	{
		id: "b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e",
		firstName: "James",
		lastName: "Wilson",
		initials: "JW",
		role: "Senior Recruiter",
		email: "james.wilson@example.com",
	},
	{
		id: "c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f",
		firstName: "Priya",
		lastName: "Patel",
		initials: "PP",
		role: "Compliance Lead",
		email: "priya.patel@example.com",
	},
	{
		id: "d4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a",
		firstName: "Marcus",
		lastName: "Johnson",
		initials: "MJ",
		role: "Onboarding Specialist",
		email: "marcus.johnson@example.com",
	},
	{
		id: "e5f6a7b8-c9d0-4e5f-2a3b-4c5d6e7f8a9b",
		firstName: "Emma",
		lastName: "Thompson",
		initials: "ET",
		role: "HR Manager",
		email: "emma.thompson@example.com",
	},
	{
		id: "f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c",
		firstName: "David",
		lastName: "Kim",
		initials: "DK",
		role: "Compliance Officer",
		email: "david.kim@example.com",
	},
];

/**
 * Get admin by ID.
 */
export function getAdminById(id: string): AdminUser | undefined {
	return mockAdmins.find((admin) => admin.id === id);
}

/**
 * Search admins by name (case-insensitive).
 */
export function searchAdmins(query: string): AdminUser[] {
	const lowerQuery = query.toLowerCase();
	return mockAdmins.filter(
		(admin) =>
			admin.firstName.toLowerCase().includes(lowerQuery) ||
			admin.lastName.toLowerCase().includes(lowerQuery) ||
			`${admin.firstName} ${admin.lastName}`.toLowerCase().includes(lowerQuery),
	);
}
