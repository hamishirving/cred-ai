"use client";

import type { ArtifactKind } from "@/components/artifact";
import { DocumentToolResult } from "@/components/document";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface SuggestionsOutput {
	id: string;
	title: string;
	kind: ArtifactKind;
	error?: string;
}

export function SuggestionsTool({
	toolCallId,
	state,
	input,
	output,
	isReadonly,
}: ToolHandlerProps<unknown, SuggestionsOutput>) {
	// Show loading state while running
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Request Suggestions"
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
		<DocumentToolResult
			isReadonly={isReadonly ?? false}
			result={output}
			type="request-suggestions"
		/>
	);
}
