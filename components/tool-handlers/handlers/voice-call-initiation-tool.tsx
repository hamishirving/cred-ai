"use client";

import { Badge } from "@/components/ui/badge";
import { PhoneCall } from "lucide-react";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface VoiceCallInitiationOutput {
	data?: {
		callId: string;
		vapiCallId: string;
		status: string;
		mode?: string;
		templateSlug?: string;
	};
	error?: string;
}

export function VoiceCallInitiationTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, VoiceCallInitiationOutput>) {
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Start Voice Call"
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
				Call started, but no call details were returned.
			</div>
		);
	}

	return (
		<div className="max-w-lg rounded-lg border bg-card p-3">
			<div className="flex items-center gap-2">
				<div className="flex-shrink-0 rounded-full bg-primary/10 p-1.5">
					<PhoneCall className="h-4 w-4 text-primary" />
				</div>
				<div className="text-sm font-medium">Voice call queued</div>
				<Badge variant="warning" className="ml-auto text-xs capitalize">
					{output.data.status}
				</Badge>
			</div>
			{output.data.mode ? (
				<p className="mt-1.5 text-xs text-muted-foreground">
					Mode: {output.data.mode}
				</p>
			) : null}
		</div>
	);
}
