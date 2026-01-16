"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getPostHogClient } from "@/lib/posthog-server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, orgMemberships, profiles, userRoles } from "@/lib/db/schema";
import { validateEmailDomain } from "@/lib/auth/domain-whitelist";

export interface AuthResult {
	error?: string;
	success?: boolean;
	message?: string;
}

export async function signUpWithEmail(
	_prevState: AuthResult,
	formData: FormData
): Promise<AuthResult> {
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;
	const firstName = formData.get("firstName") as string;
	const lastName = formData.get("lastName") as string;
	const organisationId = formData.get("organisationId") as string;
	const userRoleId = formData.get("userRoleId") as string;

	// Validate required fields
	if (!email || !password) {
		return { error: "Email and password are required" };
	}
	if (!firstName || !lastName) {
		return { error: "First name and last name are required" };
	}
	if (!organisationId || !userRoleId) {
		return { error: "Organisation and role are required" };
	}

	// Validate email domain against whitelist
	const domainError = validateEmailDomain(email);
	if (domainError) {
		return { error: domainError };
	}

	const supabase = await createClient();

	// Build callback URL for email verification
	const siteUrl =
		process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
	const emailRedirectTo = `${siteUrl}/auth/callback`;

	// 1. Create Supabase auth user
	const { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			emailRedirectTo,
		},
	});

	if (error) {
		return { error: error.message };
	}

	if (!data.user) {
		return { error: "Failed to create user" };
	}

	// 2. Create User record
	const [user] = await db
		.insert(users)
		.values({
			authUserId: data.user.id,
			email,
			firstName,
			lastName,
			currentOrgId: organisationId,
		})
		.returning();

	// 3. Create OrgMembership with selected role
	const [membership] = await db
		.insert(orgMemberships)
		.values({
			userId: user.id,
			organisationId,
			userRoleId,
			status: "active",
			joinedAt: new Date(),
		})
		.returning();

	// 4. If role is "candidate", create a Profile for compliance tracking
	const [role] = await db
		.select()
		.from(userRoles)
		.where(eq(userRoles.id, userRoleId));

	if (role?.slug === "candidate") {
		const [profile] = await db
			.insert(profiles)
			.values({
				organisationId,
				email,
				firstName,
				lastName,
				status: "invited",
			})
			.returning();

		// Link profile to membership
		await db
			.update(orgMemberships)
			.set({ profileId: profile.id })
			.where(eq(orgMemberships.id, membership.id));
	}

	// Track sign-up event
	const posthog = getPostHogClient();
	posthog.capture({
		distinctId: data.user.id,
		event: "user_signed_up",
		properties: {
			email,
			source: "email",
			organisationId,
			userRoleId,
			roleName: role?.name,
		},
	});

	posthog.identify({
		distinctId: data.user.id,
		properties: {
			email,
			firstName,
			lastName,
			organisationId,
		},
	});

	await posthog.shutdown();

	// Return success - user must verify email before logging in
	return {
		success: true,
		message:
			"Account created! Please check your email and click the verification link to continue.",
	};
}

export async function signInWithEmail(
	_prevState: AuthResult,
	formData: FormData
): Promise<AuthResult> {
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;

	if (!email || !password) {
		return { error: "Email and password are required" };
	}

	const supabase = await createClient();

	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) {
		return { error: error.message };
	}

	// Track sign-in event
	const posthog = getPostHogClient();
	if (data.user) {
		posthog.capture({
			distinctId: data.user.id,
			event: "user_signed_in",
			properties: {
				email,
				source: "email",
			},
		});

		posthog.identify({
			distinctId: data.user.id,
			properties: {
				email,
			},
		});

		await posthog.shutdown();
	}

	redirect("/");
}
