import { syncUserToDatabase } from "@/lib/db/sync-user";
import { createClient } from "@/lib/supabase/server";

export type UserType = "regular";

export async function auth() {
	const supabase = await createClient();

	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	if (error || !user) {
		return null;
	}

	const email = user.email || "";

	// Sync user to our database
	await syncUserToDatabase(user.id, email);

	return {
		user: {
			id: user.id,
			type: "regular" as UserType,
			email,
		},
	};
}

export async function signOut() {
	const supabase = await createClient();
	await supabase.auth.signOut();
}
