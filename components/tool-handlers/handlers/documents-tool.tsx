"use client";

import { DocumentsTable } from "@/components/documents-table";
import type { DocumentDto } from "@/lib/api/types";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface DocumentsOutput {
	data?: DocumentDto[];
	error?: string;
}

export function DocumentsTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, DocumentsOutput>) {
	// Show loading state while running
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Get Documents"
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

	if (output.data) {
		return <DocumentsTable documents={output.data} />;
	}

	return null;
}
