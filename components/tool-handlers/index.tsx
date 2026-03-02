"use client";

import type { ReactNode } from "react";
// Import all tool handlers
import { DataAgentTool } from "./handlers/data-agent-tool";
import { DocumentCreateTool } from "./handlers/document-create-tool";
import { DocumentUpdateTool } from "./handlers/document-update-tool";
import { EmailTool } from "./handlers/email-tool";
import { FAScreeningTool } from "./handlers/fa-screening-tool";
import { FollowupVoiceOutcomeTool } from "./handlers/followup-voice-outcome-tool";
import { FormTool } from "./handlers/form-tool";
import { KnowledgeTool } from "./handlers/knowledge-tool";
import { LocalCandidatesTool } from "./handlers/local-candidates-tool";
import { LocalComplianceTool } from "./handlers/local-compliance-tool";
import { LocalDocumentsTool } from "./handlers/local-documents-tool";
import { LocalProfileTool } from "./handlers/local-profile-tool";
import { PlacementComplianceTool } from "./handlers/placement-compliance-tool";
import { SmsTool } from "./handlers/sms-tool";
import { SuggestionsTool } from "./handlers/suggestions-tool";
import { TaskTool } from "./handlers/task-tool";
import { VoiceCallInitiationTool } from "./handlers/voice-call-initiation-tool";
import { VoiceCallStatusTool } from "./handlers/voice-call-status-tool";
import type { ToolHandlerProps } from "./types";

// Type for tool handler components with any input/output
type ToolHandler = (props: ToolHandlerProps) => ReactNode;

/**
 * Registry mapping tool types to their handler components
 */
const toolRegistry: Record<string, ToolHandler> = {
	"tool-queryDataAgent": DataAgentTool as ToolHandler,
	"tool-searchLocalCandidates": LocalCandidatesTool as ToolHandler,
	"tool-getLocalProfile": LocalProfileTool as ToolHandler,
	"tool-getLocalDocuments": LocalDocumentsTool as ToolHandler,
	"tool-getLocalCompliance": LocalComplianceTool as ToolHandler,
	"tool-createForm": FormTool as ToolHandler,
	"tool-draftEmail": EmailTool as ToolHandler,
	"tool-sendSms": SmsTool as ToolHandler,
	"tool-createDocument": DocumentCreateTool as ToolHandler,
	"tool-updateDocument": DocumentUpdateTool as ToolHandler,
	"tool-requestSuggestions": SuggestionsTool as ToolHandler,
	"tool-searchKnowledge": KnowledgeTool as ToolHandler,
	"tool-createTask": TaskTool as ToolHandler,
	"tool-getPlacementCompliance": PlacementComplianceTool as ToolHandler,
	"tool-faCheckScreening": FAScreeningTool as ToolHandler,
	"tool-initiateVoiceCall": VoiceCallInitiationTool as ToolHandler,
	"tool-initiateFollowupVoiceCall": VoiceCallInitiationTool as ToolHandler,
	"tool-getCallStatus": VoiceCallStatusTool as ToolHandler,
	"tool-applyFollowupVoiceOutcome": FollowupVoiceOutcomeTool as ToolHandler,
};

function resolveToolRegistryKey(
	toolType: string,
	toolName?: string,
): string | undefined {
	if (toolType in toolRegistry) return toolType;
	if (toolType === "dynamic-tool" && toolName) {
		const mappedType = `tool-${toolName}`;
		if (mappedType in toolRegistry) return mappedType;
	}
	return undefined;
}

/**
 * Check if a tool type has a registered handler
 */
export function hasToolHandler(toolType: string, toolName?: string): boolean {
	return Boolean(resolveToolRegistryKey(toolType, toolName));
}

/**
 * Get the handler component for a tool type
 */
export function getToolHandler(
	toolType: string,
	toolName?: string,
): ((props: ToolHandlerProps) => ReactNode) | undefined {
	const key = resolveToolRegistryKey(toolType, toolName);
	return key ? toolRegistry[key] : undefined;
}

/**
 * Render a tool using its registered handler
 */
export function renderTool(
	toolType: string,
	props: ToolHandlerProps,
	toolName?: string,
): ReactNode {
	const key = resolveToolRegistryKey(toolType, toolName);
	const Handler = key ? toolRegistry[key] : undefined;
	if (!Handler) {
		return null;
	}
	return <Handler {...props} />;
}

// Re-export types for convenience
export type { ToolHandlerProps, ToolState } from "./types";
