"use client";

import { CompliancePackagesView } from "@/components/compliance-packages-view";
import type { CompliancePackageDto } from "@/lib/api/types";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface CompliancePackagesOutput {
	data?: CompliancePackageDto[];
	error?: string;
}

export function CompliancePackagesTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, CompliancePackagesOutput>) {
	// Show loading state while running
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Get Compliance Packages"
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
		return <CompliancePackagesView packages={output.data} />;
	}

	return null;
}
