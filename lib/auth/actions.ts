"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getPostHogClient } from "@/lib/posthog-server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, orgMemberships, profiles, userRoles } from "@/lib/db/schema";

export async function signUpWithEmail(formData: FormData) {
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;
	const firstName = formData.get("firstName") as string;
	const lastName = formData.get("lastName") as string;
	const organisationId = formData.get("organisationId") as string;
	const userRoleId = formData.get("userRoleId") as string;

	// Validate required fields
	if (!email || !password) {
		throw new Error("Email and password are required");
	}
	if (!firstName || !lastName) {
		throw new Error("First name and last name are required");
	}
	if (!organisationId || !userRoleId) {
		throw new Error("Organisation and role are required");
	}

	const supabase = await createClient();

	// 1. Create Supabase auth user
	const { data, error } = await supabase.auth.signUp({
		email,
		password,
	});

	if (error) {
		throw new Error(error.message);
	}

	if (!data.user) {
		throw new Error("Failed to create user");
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

	redirect("/");
}

export async function signInWithEmail(formData: FormData) {
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;

	if (!email || !password) {
		throw new Error("Email and password are required");
	}

	const supabase = await createClient();

	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) {
		throw new Error(error.message);
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
