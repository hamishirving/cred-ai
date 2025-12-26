"use client";

import { DynamicForm } from "@/components/dynamic-form";
import type { FormSchema } from "@/lib/ai/tools/create-form";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

export function FormTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, FormSchema>) {
	// Show loading state while running
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Create Form"
				state={state}
				input={input}
			/>
		);
	}

	// Render output directly
	return (
		<DynamicForm
			onSubmit={(data) => {
				console.log("Form submitted:", data);
			}}
			schema={output}
		/>
	);
}
