"use client";

import { Badge } from "@/components/ui/badge";
import { Clock3, Phone, Volume2 } from "lucide-react";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface TranscriptMessage {
	role?: string;
	content?: string;
	timestamp?: number;
}

interface VoiceCallStatusOutput {
	data?: {
		status?: string;
		outcome?: string;
		endedReason?: string;
		duration?: number;
		pollCount?: number;
		timedOut?: boolean;
		transcript?: TranscriptMessage[];
		capturedData?: Record<string, unknown>;
		recordingUrl?: string;
	};
	error?: string;
}

function formatDuration(seconds?: number): string {
	if (!seconds && seconds !== 0) return "-";
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function capitalise(str: string): string {
	return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

function humaniseReason(reason: string): string {
	return capitalise(reason.replace(/[-_]/g, " "));
}

function outcomeVariant(
	outcome?: string,
): "success" | "warning" | "danger" | "neutral" {
	if (!outcome) return "neutral";
	if (outcome === "completed") return "success";
	if (outcome === "no_answer" || outcome === "busy" || outcome === "voicemail")
		return "warning";
	if (outcome === "failed") return "danger";
	return "neutral";
}

export function VoiceCallStatusTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, VoiceCallStatusOutput>) {
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Get Call Status"
				state={state}
				input={input}
			/>
		);
	}

	if (output.error) {
		return (
			<div className="max-w-lg rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
				{output.error}
			</div>
		);
	}

	if (!output.data) {
		return (
			<div className="max-w-lg rounded-lg border bg-card p-3 text-sm text-muted-foreground">
				No call status data was returned.
			</div>
		);
	}

	const hasCapturedData = Boolean(output.data.capturedData);
	const outcomeLabel = output.data.outcome || output.data.status || "unknown";

	return (
		<div className="max-w-lg rounded-lg border bg-card p-3 space-y-2">
			<div className="flex items-center gap-2">
				<div className="flex-shrink-0 rounded-full bg-primary/10 p-1.5">
					<Phone className="h-4 w-4 text-primary" />
				</div>
				<div className="text-sm font-medium">Call completed</div>
				<Badge
					variant={outcomeVariant(output.data.outcome)}
					className="ml-auto text-xs"
				>
					{capitalise(outcomeLabel)}
				</Badge>
			</div>

			<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
				<div className="flex items-center gap-1">
					<Clock3 className="h-3.5 w-3.5 flex-shrink-0" />
					<span className="tabular-nums">
						{formatDuration(output.data.duration)}
					</span>
				</div>
				<div>captured: {hasCapturedData ? "yes" : "no"}</div>
				{output.data.timedOut ? (
					<Badge variant="warning">timed out</Badge>
				) : null}
			</div>

			{output.data.endedReason ? (
				<p className="text-xs text-muted-foreground">
					<span className="font-medium text-foreground">Ended reason:</span>{" "}
					{humaniseReason(output.data.endedReason)}
				</p>
			) : null}

			{output.data.recordingUrl ? (
				<div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
					<Volume2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
					<audio
						controls
						preload="metadata"
						className="h-8 w-full [&::-webkit-media-controls-panel]:bg-transparent"
					>
						<source src={output.data.recordingUrl} type="audio/mpeg" />
						<track kind="captions" label="No captions available" />
					</audio>
				</div>
			) : null}
		</div>
	);
}
