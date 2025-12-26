"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const router = useRouter();

	useEffect(() => {
		const supabase = createClient();

		// Listen for auth state changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			// Refresh the page to sync server-side session
			if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
				router.refresh();
			}

			// PostHog user identification
			if (event === "SIGNED_IN" && session?.user) {
				// Identify user in PostHog using user ID as distinct ID
				posthog.identify(session.user.id, {
					email: session.user.email,
				});
			} else if (event === "SIGNED_OUT") {
				// Reset PostHog on logout to unlink future events from this user
				posthog.reset();
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [router]);

	return <>{children}</>;
}
