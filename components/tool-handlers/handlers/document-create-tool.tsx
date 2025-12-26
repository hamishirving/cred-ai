"use client";

import { DocumentPreview } from "@/components/document-preview";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface DocumentOutput {
	error?: string;
	[key: string]: unknown;
}

export function DocumentCreateTool({
	toolCallId,
	state,
	input,
	output,
	isReadonly,
}: ToolHandlerProps<unknown, DocumentOutput>) {
	// Show loading state while running
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Create Document"
				state={state}
				input={input}
			/>
		);
	}

	// Render output directly
	if (output.error) {
		return (
			<div className="text-destructive">Error: {String(output.error)}</div>
		);
	}

	return <DocumentPreview isReadonly={isReadonly ?? false} result={output} />;
}
