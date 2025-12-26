"use server";

import { redirect } from "next/navigation";
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

	// Redirect to home after successful login
	redirect("/");
}
