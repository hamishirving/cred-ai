"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	useEffect(() => {
		posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
			api_host: "/ingest",
			ui_host: "https://eu.posthog.com",
			capture_pageview: false, // We capture manually below
			capture_pageleave: true,
			capture_exceptions: true,
			debug: process.env.NODE_ENV === "development",
		});
	}, []);

	return (
		<PHProvider client={posthog}>
			<Suspense fallback={null}>
				<PostHogPageView />
			</Suspense>
			{children}
		</PHProvider>
	);
}

function PostHogPageView() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const posthog = usePostHog();

	useEffect(() => {
		if (pathname && posthog) {
			let url = window.origin + pathname;
			if (searchParams.toString()) {
				url = url + "?" + searchParams.toString();
			}
			posthog.capture("$pageview", { $current_url: url });
		}
	}, [pathname, searchParams, posthog]);

	return null;
}
