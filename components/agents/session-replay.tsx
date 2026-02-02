"use client";

import { useRef, useState, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw, Play } from "lucide-react";

const MAX_RETRIES = 8;
const INITIAL_DELAY_MS = 2000;

type ReplayState = "idle" | "loading" | "ready" | "error";

interface SessionReplayProps {
	sessionId: string;
}

export function SessionReplay({ sessionId }: SessionReplayProps) {
	const wrapperRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<{ $destroy: () => void } | null>(null);
	const cancelledRef = useRef(false);
	const [state, setState] = useState<ReplayState>("idle");
	const [error, setError] = useState<string | null>(null);
	const [retryCount, setRetryCount] = useState(0);

	const mountPlayer = useCallback(
		async (events: Array<{ type: number; data: Record<string, unknown>; timestamp: number }>) => {
			const { default: rrwebPlayer } = await import("rrweb-player");
			// @ts-expect-error -- CSS import has no type declarations
			await import("rrweb-player/dist/style.css");

			if (!containerRef.current || !wrapperRef.current) return;

			if (playerRef.current) {
				playerRef.current.$destroy();
				playerRef.current = null;
			}

			containerRef.current.innerHTML = "";

			const containerWidth = wrapperRef.current.offsetWidth;
			const width = Math.min(containerWidth, 960);
			const height = Math.round(width * 0.625);

			const player = new rrwebPlayer({
				target: containerRef.current,
				props: {
					events,
					showController: true,
					autoPlay: true,
					width,
					height,
					skipInactive: true,
				},
			});

			playerRef.current = player as unknown as { $destroy: () => void };
		},
		[],
	);

	const loadReplay = useCallback(async () => {
		cancelledRef.current = false;
		setState("loading");
		setError(null);
		setRetryCount(0);

		async function fetchWithRetry(attempt: number): Promise<Array<{ type: number; data: Record<string, unknown>; timestamp: number }>> {
			const res = await fetch(`/api/sessions/${sessionId}/recording`);

			if (res.status === 202) {
				if (attempt < MAX_RETRIES) {
					if (!cancelledRef.current) setRetryCount(attempt + 1);
					const delay = INITIAL_DELAY_MS * Math.min(2 ** attempt, 8);
					await new Promise((r) => setTimeout(r, delay));
					if (cancelledRef.current) return [];
					return fetchWithRetry(attempt + 1);
				}
				return [];
			}

			if (!res.ok) {
				throw new Error("Failed to load recording");
			}

			const recording = await res.json();
			const events = Array.isArray(recording)
				? recording.map((entry: { type: number; data: Record<string, unknown>; timestamp: number }) => ({
						type: entry.type,
						data: entry.data,
						timestamp: entry.timestamp,
					}))
				: [];

			if (events.length === 0 && attempt < MAX_RETRIES) {
				if (!cancelledRef.current) setRetryCount(attempt + 1);
				const delay = INITIAL_DELAY_MS * Math.min(2 ** attempt, 8);
				await new Promise((r) => setTimeout(r, delay));
				if (cancelledRef.current) return [];
				return fetchWithRetry(attempt + 1);
			}

			return events;
		}

		try {
			const events = await fetchWithRetry(0);

			if (cancelledRef.current) return;

			if (events.length === 0) {
				setError("Recording not available for this session");
				setState("error");
				return;
			}

			await mountPlayer(events);
			setState("ready");
		} catch (err) {
			if (!cancelledRef.current) {
				setError(err instanceof Error ? err.message : "Failed to load replay");
				setState("error");
			}
		}
	}, [sessionId, mountPlayer]);

	if (state === "error") {
		return (
			<div className="flex items-center gap-2 text-xs text-destructive py-1">
				<AlertCircle className="size-3 shrink-0" />
				<span>{error}</span>
				<button
					type="button"
					onClick={loadReplay}
					className="flex items-center gap-1 text-xs text-[#4444cf] hover:underline cursor-pointer ml-1"
				>
					<RefreshCw className="size-3" />
					Retry
				</button>
			</div>
		);
	}

	return (
		<div ref={wrapperRef} className="flex flex-col gap-1.5">
			{/* Idle placeholder — play button to trigger load */}
			{state === "idle" && (
				<button
					type="button"
					onClick={loadReplay}
					className="flex items-center justify-center rounded-md border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
					style={{ aspectRatio: "16 / 10" }}
				>
					<div className="flex flex-col items-center gap-2">
						<div className="flex items-center justify-center size-10 rounded-full bg-[#4444cf] text-white">
							<Play className="size-4 ml-0.5" />
						</div>
						<span className="text-xs text-[#8a857d]">Watch session replay</span>
					</div>
				</button>
			)}

			{/* Loading state */}
			{state === "loading" && (
				<div
					className="flex items-center justify-center rounded-md border border-border bg-muted/30"
					style={{ aspectRatio: "16 / 10" }}
				>
					<div className="flex flex-col items-center gap-2">
						<Loader2 className="size-5 animate-spin text-muted-foreground" />
						<span className="text-xs text-muted-foreground">
							{retryCount > 0
								? `Waiting for recording (attempt ${retryCount + 1}/${MAX_RETRIES + 1})...`
								: "Loading session replay..."}
						</span>
					</div>
				</div>
			)}

			{/* Player container */}
			<div
				ref={containerRef}
				className="session-replay-container rounded-md overflow-hidden border border-border [&_.rr-player]:!w-full [&_.rr-player__frame]:!w-full [&_.rr-controller]:text-xs [&_.rr-timeline]:!w-full"
				style={{ display: state === "ready" ? "block" : "none" }}
			/>
		</div>
	);
}
