"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		const supabase = createClient();

		// Check if user is already signed in
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (!session) {
				// No session, sign in anonymously
				supabase.auth.signInAnonymously().catch((error) => {
					console.error("Failed to sign in anonymously:", error);
				});
			}
		});

		// Listen for auth state changes
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (event === "SIGNED_OUT" && !session) {
				// Auto sign in again when user signs out
				supabase.auth.signInAnonymously().catch((error) => {
					console.error("Failed to sign in anonymously:", error);
				});
			}
		});

		return () => {
			subscription.unsubscribe();
		};
	}, []);

	return <>{children}</>;
}
