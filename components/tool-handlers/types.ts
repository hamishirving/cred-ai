import type { ReactNode } from "react";

/**
 * Tool state as defined by the AI SDK
 */
export type ToolState =
	| "partial-call"
	| "call"
	| "result"
	| "input-streaming"
	| "input-available"
	| "approval-requested"
	| "approval-responded"
	| "output-available"
	| "output-error"
	| "output-denied";

/**
 * Props for the generic ToolRenderer component
 */
export interface ToolRendererProps {
	/** Unique identifier for this tool call */
	toolCallId: string;
	/** Display name for the tool (shown in header) */
	toolName: string;
	/** Current state of the tool execution */
	state?: ToolState;
	/** Input parameters passed to the tool */
	input?: unknown;
	/** Output from the tool (if completed) */
	output?: unknown;
	/** Function to render the output */
	renderOutput: (output: unknown) => ReactNode;
	/** Whether the collapsible should be open by default */
	defaultOpen?: boolean;
	/** Whether to show input parameters */
	showInput?: boolean;
}

/**
 * Props passed to individual tool handler components
 */
export interface ToolHandlerProps<TInput = unknown, TOutput = unknown> {
	toolCallId: string;
	state?: ToolState;
	input?: TInput;
	output?: TOutput;
	/** Whether the chat is in readonly mode */
	isReadonly?: boolean;
}

/**
 * Derives a display-friendly tool state from the raw state
 */
export function deriveToolState(
	state: ToolState | undefined,
	output: unknown,
): ToolState {
	if (state) return state;
	if (!output) return "input-available"; // Show as running if no output yet
	return "output-available";
}
