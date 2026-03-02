"use client";

import { SmsMessageComponent } from "@/components/sms-message";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface SmsOutput {
	data?: {
		recipientName?: string;
		recipientPhone: string;
		body: string;
		status: string;
		sid?: string;
		from?: string | null;
		to?: string;
	};
	error?: string;
}

export function SmsTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, SmsOutput>) {
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Send SMS"
				state={state}
				input={input}
			/>
		);
	}

	if (!output.data) {
		return (
			<div className="w-[600px] max-w-full text-destructive text-sm">
				{output.error ?? "SMS output unavailable"}
			</div>
		);
	}

	return (
		<div className="w-[600px] max-w-full space-y-2">
			{output.error ? (
				<div className="text-destructive text-sm">{output.error}</div>
			) : null}
			<SmsMessageComponent sms={output.data} />
		</div>
	);
}
