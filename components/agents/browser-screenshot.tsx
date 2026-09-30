"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { BrowserAction } from "@/lib/ai/agents/types";

async function resolveScreenshotUrl(action: BrowserAction): Promise<string | null> {
	if (action.screenshotUrl) return action.screenshotUrl;
	if (!action.screenshotPath) return null;

	try {
		const res = await fetch(
			`/api/documents/signed-url?path=${encodeURIComponent(action.screenshotPath)}`,
		);
		if (!res.ok) return null;
		const data = (await res.json()) as { url?: string };
		return data.url || null;
	} catch {
		return null;
	}
}

/** Download and decode an image so swapping it in doesn't flash blank */
async function preloadImage(url: string): Promise<void> {
	const img = new Image();
	img.src = url;
	try {
		await img.decode();
	} catch {
		// Show it anyway; the browser will render whatever it can
	}
}

/**
 * Latest browser screenshot for a set of actions.
 * Keeps the current image on screen until the next one has loaded, then crossfades.
 */
export function BrowserScreenshot({
	browserActions,
}: {
	browserActions: BrowserAction[];
}) {
	// Later actions without a screenshot keep the last one showing
	const latestScreenshotAction = useMemo(
		() =>
			browserActions.findLast((a) => !!(a.screenshotUrl || a.screenshotPath)) ??
			null,
		[browserActions],
	);
	// Seed from the signed URL when we have one, so a remount (preview -> step card) shows it immediately
	const [shownUrl, setShownUrl] = useState<string | null>(
		() => latestScreenshotAction?.screenshotUrl ?? null,
	);

	const shownUrlRef = useRef(shownUrl);
	shownUrlRef.current = shownUrl;

	useEffect(() => {
		if (!latestScreenshotAction) return;
		let cancelled = false;

		async function load(action: BrowserAction) {
			const url = await resolveScreenshotUrl(action);
			if (!url || cancelled) return;
			if (url === shownUrlRef.current) return;
			await preloadImage(url);
			if (!cancelled) setShownUrl(url);
		}

		void load(latestScreenshotAction);
		return () => {
			cancelled = true;
		};
	}, [latestScreenshotAction]);

	if (!latestScreenshotAction) return null;

	return (
		<div className="relative rounded border border-border/50 bg-muted/20 aspect-[16/10] overflow-hidden">
			{shownUrl ? (
				<a
					href={shownUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="block h-full"
				>
					<AnimatePresence initial={false}>
						<motion.img
							key={shownUrl}
							src={shownUrl}
							alt="Browser action screenshot"
							className="absolute inset-0 w-full h-full object-cover object-top"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
						/>
					</AnimatePresence>
				</a>
			) : (
				<div className="h-full flex items-center justify-center gap-2 text-xs text-muted-foreground">
					<Loader2 className="size-3 animate-spin" />
					Loading screenshot...
				</div>
			)}
		</div>
	);
}
