import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handle Supabase email verification callback
 *
 * When users click the verification link in their email,
 * Supabase redirects here with a code that we exchange for a session.
 */
export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url);
	const code = searchParams.get("code");

	if (code) {
		const supabase = await createClient();
		const { error } = await supabase.auth.exchangeCodeForSession(code);

		if (!error) {
			// Verification successful - redirect to app
			return NextResponse.redirect(`${origin}/`);
		}
	}

	// Verification failed - redirect to login with error
	return NextResponse.redirect(`${origin}/login?error=verification_failed`);
}
