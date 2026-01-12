"use client";

import { ProfileCard } from "@/components/profile-card";
import type { ProfileDto } from "@/lib/api/types";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface ProfileOutput {
	data?: ProfileDto;
	matches?: ProfileDto[];
	total?: number;
	query?: string;
	error?: string;
}

export function ProfileTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, ProfileOutput>) {
	// Show loading state while running
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Get Profile"
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
		return <ProfileCard profile={output.data} />;
	}

	if (output.matches && output.matches.length > 0) {
		return (
			<div className="not-prose my-4">
				<div className="mb-2 text-muted-foreground text-sm">
					Found {output.total ?? output.matches.length} matches
					{output.query ? ` for "${output.query}"` : ""} (showing{" "}
					{output.matches.length})
				</div>
				<div className="flex flex-col gap-2">
					{output.matches.map((profile) => (
						<ProfileCard key={profile.id} profile={profile} />
					))}
				</div>
			</div>
		);
	}

	return null;
}
