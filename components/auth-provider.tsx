"use client";

import { useRouter } from "next/navigation";
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
		});

		return () => {
			subscription.unsubscribe();
		};
	}, [router]);

	return <>{children}</>;
}
