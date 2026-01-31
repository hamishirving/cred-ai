"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, ExternalLink, Monitor, MousePointer, Type, Navigation, Eye, Loader2 } from "lucide-react";
import type { SkillStep, BrowserAction } from "@/lib/ai/skills/types";

function ActionIcon({ type }: { type: string }) {
	const lower = type.toLowerCase();
	if (lower === "goto" || lower === "navigate") return <Navigation className="size-3" />;
	if (lower === "click" || lower === "act") return <MousePointer className="size-3" />;
	if (lower === "type" || lower === "fillform") return <Type className="size-3" />;
	if (lower === "screenshot") return <Monitor className="size-3" />;
	if (lower === "extract" || lower === "observe") return <Eye className="size-3" />;
	if (lower === "browser-ready") return <Globe className="size-3" />;
	return <Globe className="size-3" />;
}

function formatAction(action: BrowserAction): string {
	if (action.type === "browser-ready") return "Browser session ready";
	if (action.action) {
		try {
			const parsed = JSON.parse(action.action);
			if (parsed.instruction) return parsed.instruction;
			if (parsed.action) return parsed.action;
			if (parsed.url) return `Navigate to ${new URL(parsed.url).hostname}`;
			if (parsed.text) return `Type "${parsed.text}"`;
		} catch {
			if (action.action.length < 120) return action.action;
		}
	}
	return action.type;
}

interface BrowserStepCardProps {
	step: SkillStep;
	liveViewUrl?: string | null;
	browserActions?: BrowserAction[];
	isActive?: boolean;
}

export function BrowserStepCard({ step, liveViewUrl, browserActions = [], isActive }: BrowserStepCardProps) {
	if (step.type !== "tool-call" || step.toolName !== "browseAndVerify")
		return null;

	const output = step.toolOutput as
		| {
				data?: {
					result?: {
						success?: boolean;
						message?: string;
						actions?: Array<{ type: string; reasoning?: string; action?: string }>;
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
	const hasError = !!output?.error;
	const sessionId = output?.data?.browserSessionId;
	const hasOutput = !!output;

	return (
		<Card className="border-blue-200 dark:border-blue-900">
			<CardContent className="p-3">
				<div className="flex flex-col gap-1.5">
					{/* Header row */}
					<div className="flex items-center gap-2">
						<div className="flex items-center justify-center size-5 rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
							<Globe className="size-3 text-blue-600 dark:text-blue-400" />
						</div>
						<span className="text-xs font-medium">
							Browser Verification
						</span>
						{verified !== undefined && (
							<Badge
								variant={verified ? "default" : "destructive"}
								className={
									verified
										? "bg-green-600 hover:bg-green-700 ml-auto"
										: "ml-auto"
								}
							>
								{verified ? "Verified" : "Not Verified"}
							</Badge>
						)}
						{hasError && (
							<Badge variant="destructive" className="ml-auto">
								Error
							</Badge>
						)}
						{!hasOutput && isActive && (
							<Badge variant="secondary" className="ml-auto gap-1">
								<Loader2 className="size-3 animate-spin" />
								Running
							</Badge>
						)}
						<Badge variant="outline" className="text-xs">
							Step {step.index}
						</Badge>
					</div>

					{/* Body — all aligned to ml-7 */}
					<div className="ml-7 flex flex-col gap-1">
						{/* Real-time browser actions */}
						{browserActions.length > 0 && (
							<div className="flex flex-col gap-1">
								{browserActions.map((action) => (
									<div
										key={action.index}
										className="flex items-start gap-1.5 text-xs text-muted-foreground"
									>
										<div className="flex items-center justify-center size-4 rounded bg-blue-50 dark:bg-blue-900/20 shrink-0 mt-0.5">
											<ActionIcon type={action.type} />
										</div>
										<span className="leading-relaxed">
											{formatAction(action)}
										</span>
									</div>
								))}
								{isActive && !hasOutput && (
									<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
										<Loader2 className="size-3 animate-spin" />
										<span>Working...</span>
									</div>
								)}
							</div>
						)}

						{/* Agent result message */}
						{agentResult?.message && (
							<p className="text-xs text-muted-foreground leading-relaxed">
								{agentResult.message}
							</p>
						)}

						{/* Browserbase session link */}
						{sessionId && (
							<a
								href={`https://www.browserbase.com/sessions/${sessionId}`}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
							>
								<ExternalLink className="size-3" />
								View session replay
							</a>
						)}

						{/* Error */}
						{hasError && (
							<p className="text-xs text-destructive">{output.error}</p>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
