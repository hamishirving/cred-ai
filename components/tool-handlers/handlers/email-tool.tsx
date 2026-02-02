"use client";

import { EmailDraftComponent } from "@/components/email-draft";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface EmailOutput {
	data?: {
		recipientName: string;
		recipientEmail: string;
		subject: string;
		body: string;
		status: string;
	};
	error?: string;
	// Legacy fields (direct return from chat tool usage)
	recipientName?: string;
	recipientEmail?: string;
	subject?: string;
	body?: string;
	cc?: string;
}

export function EmailTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, EmailOutput>) {
	// Show loading state while running
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Draft Email"
				state={state}
				input={input}
			/>
		);
	}

	// Normalise: handle both { data: { ... } } and flat formats
	const email = output.data ?? {
		recipientName: output.recipientName ?? "",
		recipientEmail: output.recipientEmail ?? "",
		subject: output.subject ?? "",
		body: output.body ?? "",
	};

	// Render output directly
	return <EmailDraftComponent email={email} />;
}
