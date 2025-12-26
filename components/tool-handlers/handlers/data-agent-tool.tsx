"use client";

import { BackendResponse } from "@/components/backend-response";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface DataAgentOutput {
	data?: unknown;
	error?: string;
}

export function DataAgentTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, DataAgentOutput>) {
	// Show loading state while running
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Query Data"
				state={state}
				input={input}
			/>
		);
	}

	// Render output directly
	return <BackendResponse output={output} />;
}
