"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
	Globe,
	MousePointer,
	Type,
	Navigation,
	Eye,
	Loader2,
	CheckCircle2,
	XCircle,
	AlertCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { AgentStep, BrowserAction } from "@/lib/ai/agents/types";
import { SessionReplay } from "@/components/agents/session-replay";

function ActionIcon({ type }: { type: string }) {
	const lower = type.toLowerCase();
	if (lower === "goto" || lower === "navigate")
		return <Navigation className="size-3" />;
	if (lower === "click" || lower === "act")
		return <MousePointer className="size-3" />;
	if (lower === "type" || lower === "fillform")
		return <Type className="size-3" />;
	if (lower === "extract" || lower === "observe")
		return <Eye className="size-3" />;
	if (lower === "browser-ready") return <Globe className="size-3" />;
	return <Globe className="size-3" />;
}

function actionVerb(type: string): string {
	const lower = type.toLowerCase();
	if (lower === "goto" || lower === "navigate") return "Navigate";
	if (lower === "click" || lower === "act") return "Click";
	if (lower === "type" || lower === "fillform") return "Type";
	if (lower === "extract" || lower === "observe") return "Extract";
	if (lower === "screenshot") return "Screenshot";
	if (lower === "browser-ready") return "Ready";
	return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatAction(action: BrowserAction): string {
	if (action.type === "browser-ready") return "Browser session initialised";
	if (action.action) {
		try {
			const parsed = JSON.parse(action.action);
			if (parsed.instruction) return parsed.instruction;
			if (parsed.action) return parsed.action;
			if (parsed.url) return new URL(parsed.url).hostname;
			if (parsed.text) return `"${parsed.text}"`;
		} catch {
			if (action.action.length < 120) return action.action;
		}
	}
	return action.type;
}

interface BrowserStepCardProps {
	step: AgentStep;
	liveViewUrl?: string | null;
	browserActions?: BrowserAction[];
	isActive?: boolean;
}

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

export function BrowserStepCard({
	step,
	liveViewUrl,
	browserActions = [],
	isActive,
}: BrowserStepCardProps) {
	const isBrowserTool =
		step.type === "tool-call" &&
		(step.toolName === "browseAndVerify" ||
			step.toolName === "dvlaBrowseVerify" ||
			step.toolName === "gdcBrowseVerify" ||
			step.toolName === "bonBrowseVerify");
	if (!isBrowserTool) return null;

	const output = step.toolOutput as
		| {
				data?: {
					result?: {
						success?: boolean;
						message?: string;
						actions?: Array<{
							type: string;
							reasoning?: string;
							action?: string;
						}>;
					};
					fields?: Record<string, string>;
					verified?: boolean;
					liveViewUrl?: string;
					browserSessionId?: string;
				};
				error?: string;
		  }
		| undefined;

	const verified = output?.data?.verified;
	const agentResult = output?.data?.result;
	const fields = output?.data?.fields;
	const hasError = !!output?.error;
	const sessionId = output?.data?.browserSessionId;
	const hasOutput = !!output;
	const latestAction = useMemo(
		() =>
			browserActions.length > 0
				? browserActions[browserActions.length - 1]
				: null,
		[browserActions],
	);
	const [latestScreenshotUrl, setLatestScreenshotUrl] = useState<string | null>(
		null,
	);
	const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function loadScreenshot() {
			if (!latestAction) {
				setLatestScreenshotUrl(null);
				setIsScreenshotLoading(false);
				return;
			}

			const hasScreenshotSource = !!(
				latestAction.screenshotUrl || latestAction.screenshotPath
			);
			if (!hasScreenshotSource) {
				setLatestScreenshotUrl(null);
				setIsScreenshotLoading(false);
				return;
			}

			setLatestScreenshotUrl(null);
			setIsScreenshotLoading(true);
			const url = await resolveScreenshotUrl(latestAction);
			if (!cancelled) {
				setLatestScreenshotUrl(url);
				setIsScreenshotLoading(false);
			}
		}

		void loadScreenshot();
		return () => {
			cancelled = true;
		};
	}, [latestAction]);

	return (
		<Card className="shadow-none border-border/50">
			<CardContent className="p-3">
				<div className="flex flex-col gap-1.5">
					{/* Header row */}
					<div className="flex items-center gap-2">
						<div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
							<Globe className="size-3 text-muted-foreground" />
						</div>
						<span className="text-xs font-medium">
							{step.toolName === "dvlaBrowseVerify"
								? "DVLA Portal Verification"
								: step.toolName === "gdcBrowseVerify"
									? "GDC Register Verification"
									: step.toolName === "bonBrowseVerify"
										? "BON Licence Verification"
										: "Browser Verification"}
						</span>
						{verified !== undefined &&
							(verified ? (
								<CheckCircle2 className="ml-auto size-3 text-[var(--positive)]" />
							) : (
								<XCircle className="size-3 text-destructive ml-auto" />
							))}
						{hasError && (
							<AlertCircle className="size-3 text-destructive ml-auto" />
						)}
						{!hasOutput && isActive && (
							<Loader2 className="ml-auto size-3 animate-spin text-muted-foreground" />
						)}
					</div>

					{/* Body — all aligned to ml-7 */}
					<div className="ml-7 flex flex-col gap-1">
						{/* Real-time browser actions — show latest only */}
						{latestAction && (
							<div>
								<AnimatePresence mode="wait">
									<motion.div
										key={latestAction.index}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.25 }}
										className="space-y-1.5"
									>
										<div className="flex items-start gap-1.5 text-xs text-muted-foreground">
											<div className="flex items-center justify-center size-4 shrink-0 mt-0.5">
												<ActionIcon type={latestAction.type} />
											</div>
											<span className="leading-relaxed truncate">
												<span className="font-medium text-foreground/80">
													{actionVerb(latestAction.type)}:
												</span>{" "}
												{formatAction(latestAction)}
											</span>
											{isActive && !hasOutput && (
												<Loader2 className="size-3 animate-spin shrink-0 ml-auto" />
											)}
										</div>
										{(latestScreenshotUrl || isScreenshotLoading) && (
											<div className="rounded border border-border/50 bg-muted/20 aspect-[16/10] overflow-hidden">
												{latestScreenshotUrl ? (
													<a
														href={latestScreenshotUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="block h-full"
													>
														{/* eslint-disable-next-line @next/next/no-img-element */}
														<img
															src={latestScreenshotUrl}
															alt="Browser action screenshot"
															className="w-full h-full object-cover"
														/>
													</a>
												) : (
													<div className="h-full flex items-center justify-center gap-2 text-xs text-muted-foreground">
														<Loader2 className="size-3 animate-spin" />
														Loading screenshot...
													</div>
												)}
											</div>
										)}
									</motion.div>
								</AnimatePresence>
							</div>
						)}

						{/* Error */}
						{hasError && (
							<p className="text-xs text-destructive">{output.error}</p>
						)}
					</div>

					{/* Results section — separated from actions */}
					{hasOutput &&
						!hasError &&
						(fields || agentResult?.message || sessionId) && (
							<div className="ml-7 flex flex-col gap-2 mt-1 pt-2 border-t border-border/50">
								{/* Structured fields */}
								{fields && Object.keys(fields).length > 0 && (
									<div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
										{Object.entries(fields).map(([key, value]) => (
											<div
												key={key}
												className="col-span-2 grid grid-cols-subgrid"
											>
												<span className="text-muted-foreground">{key}</span>
												<span className="font-medium">{value}</span>
											</div>
										))}
									</div>
								)}
								{/* Fallback raw message (only if no fields) */}
								{agentResult?.message &&
									(!fields || Object.keys(fields).length === 0) && (
										<p className="text-xs leading-relaxed text-muted-foreground">
											{agentResult.message}
										</p>
									)}

								{/* Session replay */}
								{sessionId && <SessionReplay sessionId={sessionId} />}
							</div>
						)}
				</div>
			</CardContent>
		</Card>
	);
}
