"use client";

import { EmailDraftComponent } from "@/components/email-draft";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface EmailOutput {
	to: string;
	subject: string;
	body: string;
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

	// Render output directly
	return <EmailDraftComponent email={output} />;
}
