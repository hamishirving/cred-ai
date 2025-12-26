"use client";

import { ProfileCard } from "@/components/profile-card";
import type { ProfileDto } from "@/lib/api/types";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface ProfileOutput {
	data?: ProfileDto;
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

	return null;
}
