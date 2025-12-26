"use client";

import type { ReactNode } from "react";
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
} from "@/components/elements/tool";
import { deriveToolState, type ToolState } from "./types";

interface ToolLoadingProps {
	toolCallId: string;
	toolName: string;
	state?: ToolState;
	input?: unknown;
}

/**
 * Shows loading state while tool is running.
 * Returns null when tool has completed (output should be rendered directly).
 */
export function ToolLoading({
	toolCallId,
	toolName,
	state,
	input,
}: ToolLoadingProps): ReactNode {
	const derivedState = deriveToolState(state, undefined);
	const isRunning =
		derivedState === "input-available" ||
		derivedState === "input-streaming" ||
		derivedState === "partial-call" ||
		derivedState === "call";

	if (!isRunning) return null;

	return (
		<Tool defaultOpen={true} key={toolCallId}>
			<ToolHeader state={derivedState} type={toolName} />
			<ToolContent>
				{input !== undefined ? (
					<ToolInput input={input as Record<string, unknown>} />
				) : null}
			</ToolContent>
		</Tool>
	);
}
