"use client";

import { DocumentPreview } from "@/components/document-preview";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface DocumentOutput {
	error?: string;
	[key: string]: unknown;
}

export function DocumentUpdateTool({
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
				toolName="Update Document"
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

	return (
		<DocumentPreview
			args={{ ...output, isUpdate: true }}
			isReadonly={isReadonly ?? false}
			result={output}
		/>
	);
}
