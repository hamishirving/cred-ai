"use client";

import type { ComponentType } from "react";
import type { AgentStep } from "@/lib/ai/agents/types";
import { EmailDraftComponent } from "@/components/email-draft";
import { CallResultsDisplay } from "./call-results-display";

export type ToolDisplayProps = {
	data: unknown;
	allSteps?: AgentStep[];
};

type ToolDisplay = {
	label: string;
	component: ComponentType<ToolDisplayProps>;
};

function EmailDisplayWrapper({ data }: ToolDisplayProps) {
	const output = data as { data?: Record<string, unknown> } | undefined;
	const emailData = output?.data as {
		recipientName?: string;
		recipientEmail?: string;
		subject?: string;
		body?: string;
		cc?: string;
	} | undefined;

	if (!emailData?.recipientEmail || !emailData?.subject || !emailData?.body) {
		return <p className="text-sm text-muted-foreground">No email data available.</p>;
	}

	return (
		<EmailDraftComponent
			email={{
				recipientName: emailData.recipientName,
				recipientEmail: emailData.recipientEmail,
				subject: emailData.subject,
				body: emailData.body,
				cc: emailData.cc,
			}}
		/>
	);
}

function CallResultsWrapper({ data, allSteps }: ToolDisplayProps) {
	const output = data as { data?: Record<string, unknown> } | undefined;
	if (!output?.data) {
		return <p className="text-sm text-muted-foreground">No call data available.</p>;
	}

	// Find the initiateVoiceCall step to get original reference data
	const initiateStep = allSteps?.find(
		(s) => s.type === "tool-call" && s.toolName === "initiateVoiceCall",
	);
	const originalContext = (initiateStep?.toolInput as { context?: Record<string, string> })?.context;

	return <CallResultsDisplay data={output.data} originalContext={originalContext} />;
}

export const toolDisplayRegistry: Record<string, ToolDisplay> = {
	draftEmail: {
		label: "View Email",
		component: EmailDisplayWrapper,
	},
	getCallStatus: {
		label: "View Call Results",
		component: CallResultsWrapper,
	},
};
