"use client";

import type { ReactNode } from "react";
// Import all tool handlers
import { DataAgentTool } from "./handlers/data-agent-tool";
import { DocumentCreateTool } from "./handlers/document-create-tool";
import { DocumentUpdateTool } from "./handlers/document-update-tool";
import { EmailTool } from "./handlers/email-tool";
import { FAScreeningTool } from "./handlers/fa-screening-tool";
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
};

/**
 * Check if a tool type has a registered handler
 */
export function hasToolHandler(toolType: string): boolean {
	return toolType in toolRegistry;
}

/**
 * Get the handler component for a tool type
 */
export function getToolHandler(
	toolType: string,
): ((props: ToolHandlerProps) => ReactNode) | undefined {
	return toolRegistry[toolType];
}

/**
 * Render a tool using its registered handler
 */
export function renderTool(
	toolType: string,
	props: ToolHandlerProps,
): ReactNode {
	const Handler = toolRegistry[toolType];
	if (!Handler) {
		return null;
	}
	return <Handler {...props} />;
}

// Re-export types for convenience
export type { ToolHandlerProps, ToolState } from "./types";
