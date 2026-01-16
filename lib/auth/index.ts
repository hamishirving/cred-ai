import { and, eq } from "drizzle-orm";
import { syncUserToDatabase } from "@/lib/db/sync-user";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, orgMemberships, profiles, userRoles } from "@/lib/db/schema";

export type UserType = "regular";

export interface AuthSession {
	user: {
		id: string;
		authUserId: string;
		type: UserType;
		email: string;
		firstName: string;
		lastName: string;
		currentOrgId: string | null;
		roleName: string | null;
		roleSlug: string | null;
	};
	membership: {
		id: string;
		organisationId: string;
		userRoleId: string;
		profileId: string | null;
		status: string;
		role?: {
			id: string;
			name: string;
			slug: string;
			permissions: string[];
		};
	} | null;
	profile: {
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		status: string;
	} | null;
}

export async function auth(): Promise<AuthSession | null> {
	const supabase = await createClient();

	const {
		data: { user: authUser },
		error,
	} = await supabase.auth.getUser();

	if (error || !authUser) {
		return null;
	}

	// Block unverified users
	if (!authUser.email_confirmed_at) {
		return null;
	}

	const email = authUser.email || "";

	// Sync user to our database (creates if doesn't exist)
	const dbUser = await syncUserToDatabase(authUser.id, email);

	if (!dbUser) {
		return null;
	}

	// Build base session
	const session: AuthSession = {
		user: {
			id: dbUser.id,
			authUserId: authUser.id,
			type: "regular" as UserType,
			email: dbUser.email,
			firstName: dbUser.firstName,
			lastName: dbUser.lastName,
			currentOrgId: dbUser.currentOrgId,
			roleName: null,
			roleSlug: null,
		},
		membership: null,
		profile: null,
	};

	// If user has a current org, get their membership
	if (dbUser.currentOrgId) {
		const [membership] = await db
			.select({
				membership: orgMemberships,
				role: userRoles,
			})
			.from(orgMemberships)
			.leftJoin(userRoles, eq(orgMemberships.userRoleId, userRoles.id))
			.where(
				and(
					eq(orgMemberships.userId, dbUser.id),
					eq(orgMemberships.organisationId, dbUser.currentOrgId)
				)
			);

		if (membership) {
			session.membership = {
				id: membership.membership.id,
				organisationId: membership.membership.organisationId,
				userRoleId: membership.membership.userRoleId,
				profileId: membership.membership.profileId,
				status: membership.membership.status,
				role: membership.role
					? {
							id: membership.role.id,
							name: membership.role.name,
							slug: membership.role.slug,
							permissions: membership.role.permissions,
						}
					: undefined,
			};

			// Update user with role info
			if (membership.role) {
				session.user.roleName = membership.role.name;
				session.user.roleSlug = membership.role.slug;
			}

			// If membership has a profile, fetch it
			if (membership.membership.profileId) {
				const [profile] = await db
					.select()
					.from(profiles)
					.where(eq(profiles.id, membership.membership.profileId));

				if (profile) {
					session.profile = {
						id: profile.id,
						firstName: profile.firstName,
						lastName: profile.lastName,
						email: profile.email,
						status: profile.status,
					};
				}
			}
		}
	}

	return session;
}

export async function signOut() {
	const supabase = await createClient();
	await supabase.auth.signOut();
}
