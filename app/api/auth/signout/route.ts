import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";
import { getPostHogClient } from "@/lib/posthog-server";

export async function POST() {
	try {
		// Get the current user before signing out to track the event
		const session = await auth();
		if (session?.user) {
			const posthog = getPostHogClient();
			posthog.capture({
				distinctId: session.user.id,
				event: "user_signed_out",
				properties: {
					email: session.user.email,
				},
			});
			await posthog.shutdown();
		}

		await signOut();
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Sign out error:", error);
		return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
	}
}
