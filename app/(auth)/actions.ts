"use server";

import { redirect } from "next/navigation";
import { getPostHogClient } from "@/lib/posthog-server";
import { createClient } from "@/lib/supabase/server";

export async function signUpWithEmail(formData: FormData) {
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;

	if (!email || !password) {
		throw new Error("Email and password are required");
	}

	const supabase = await createClient();

	const { data, error } = await supabase.auth.signUp({
		email,
		password,
	});

	if (error) {
		throw new Error(error.message);
	}

	// Track sign-up event on server side
	const posthog = getPostHogClient();
	if (data.user) {
		posthog.capture({
			distinctId: data.user.id,
			event: "user_signed_up",
			properties: {
				email: email,
				source: "email",
			},
		});

		// Identify user on server side
		posthog.identify({
			distinctId: data.user.id,
			properties: {
				email: email,
			},
		});

		await posthog.shutdown();
	}

	// Redirect to home after successful signup
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

	// Track sign-in event on server side
	const posthog = getPostHogClient();
	if (data.user) {
		posthog.capture({
			distinctId: data.user.id,
			event: "user_signed_in",
			properties: {
				email: email,
				source: "email",
			},
		});

		// Identify user on server side
		posthog.identify({
			distinctId: data.user.id,
			properties: {
				email: email,
			},
		});

		await posthog.shutdown();
	}

	// Redirect to home after successful login
	redirect("/");
}
