"use client";

import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface CandidateResult {
	userId: string;
	profileId: string | null;
	firstName: string;
	lastName: string;
	email: string;
	organisationId: string;
}

interface SearchOutput {
	data?: CandidateResult[];
	error?: string;
}

export function LocalCandidatesTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, SearchOutput>) {
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Search Candidates"
				state={state}
				input={input}
			/>
		);
	}

	if (output.error) {
		return (
			<div className="text-destructive text-sm">
				Error: {String(output.error)}
			</div>
		);
	}

	if (!output.data || output.data.length === 0) {
		return (
			<div className="text-sm text-muted-foreground py-2">
				No candidates found
			</div>
		);
	}

	// Single result — keep it minimal, the profile card will follow
	if (output.data.length === 1) {
		return null;
	}

	// Multiple results — show a compact list so the user can disambiguate
	return (
		<div className="not-prose my-2 text-muted-foreground text-xs">
			Found {output.data.length} candidates:{" "}
			{output.data.map((c, i) => (
				<span key={c.profileId ?? c.userId}>
					{i > 0 && ", "}
					<span className="font-medium text-foreground">
						{c.firstName} {c.lastName}
					</span>
				</span>
			))}
		</div>
	);
}
