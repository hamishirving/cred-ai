"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Globe, MousePointer, Type, Navigation, Eye, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { AgentStep, BrowserAction } from "@/lib/ai/agents/types";
import { SessionReplay } from "@/components/agents/session-replay";

function ActionIcon({ type }: { type: string }) {
	const lower = type.toLowerCase();
	if (lower === "goto" || lower === "navigate") return <Navigation className="size-3" />;
	if (lower === "click" || lower === "act") return <MousePointer className="size-3" />;
	if (lower === "type" || lower === "fillform") return <Type className="size-3" />;
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
	step: AgentStep;
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
	const fields = output?.data?.fields;
	const hasError = !!output?.error;
	const sessionId = output?.data?.browserSessionId;
	const hasOutput = !!output;

	return (
		<Card className="shadow-none border-border/50">
			<CardContent className="p-3">
				<div className="flex flex-col gap-1.5">
					{/* Header row */}
					<div className="flex items-center gap-2">
						<div className="flex items-center justify-center size-5 rounded-full bg-[#eeedf8] shrink-0">
							<Globe className="size-3 text-[#4444cf]" />
						</div>
						<span className="text-xs font-medium">
							Browser Verification
						</span>
						{verified !== undefined && (
							verified
								? <CheckCircle2 className="size-3 text-[#3a9960] ml-auto" />
								: <XCircle className="size-3 text-destructive ml-auto" />
						)}
						{hasError && (
							<AlertCircle className="size-3 text-destructive ml-auto" />
						)}
						{!hasOutput && isActive && (
							<Loader2 className="size-3 animate-spin text-[#8a857d] ml-auto" />
						)}
					</div>

					{/* Body — all aligned to ml-7 */}
					<div className="ml-7 flex flex-col gap-1">
						{/* Real-time browser actions */}
						{browserActions.length > 0 && (
							<div className="flex flex-col gap-1">
								{browserActions.map((action) => (
									<div
										key={action.index}
										className="flex items-start gap-1.5 text-xs text-[#8a857d]"
									>
										<div className="flex items-center justify-center size-4 rounded bg-[#eeedf8] shrink-0 mt-0.5">
											<ActionIcon type={action.type} />
										</div>
										<span className="leading-relaxed">
											{formatAction(action)}
										</span>
									</div>
								))}
								{isActive && !hasOutput && (
									<div className="flex items-center gap-1.5 text-xs text-[#8a857d]">
										<Loader2 className="size-3 animate-spin" />
										<span>Working...</span>
									</div>
								)}
							</div>
						)}

						{/* Error */}
						{hasError && (
							<p className="text-xs text-destructive">{output.error}</p>
						)}
					</div>

					{/* Results section — separated from actions */}
					{hasOutput && !hasError && (fields || agentResult?.message || sessionId) && (
						<div className="ml-7 flex flex-col gap-2 mt-1 pt-2 border-t border-border/50">
							{/* Structured fields */}
							{fields && Object.keys(fields).length > 0 && (
								<div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
									{Object.entries(fields).map(([key, value]) => (
										<div key={key} className="col-span-2 grid grid-cols-subgrid">
											<span className="text-[#8a857d]">{key}</span>
											<span className="font-medium">{value}</span>
										</div>
									))}
								</div>
							)}
							{/* Fallback raw message (only if no fields) */}
							{agentResult?.message && (!fields || Object.keys(fields).length === 0) && (
								<p className="text-xs text-[#8a857d] leading-relaxed">
									{agentResult.message}
								</p>
							)}

							{/* Session replay */}
							{sessionId && (
								<SessionReplay sessionId={sessionId} />
							)}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
