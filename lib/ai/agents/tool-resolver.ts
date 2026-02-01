/**
 * Tool Resolver
 *
 * Maps agent tool name strings to actual tool instances from the shared registry.
 * Agents declare tools by name; this resolves them to executable tool objects.
 *
 * Supports context-aware tool factories (e.g. browseAndVerify with onAction callback).
 */

import type { Tool } from "ai";
import { getProfile } from "@/lib/ai/tools/get-profile";
import { getDocuments } from "@/lib/ai/tools/get-profile-documents";
import { createTaskTool } from "@/lib/ai/tools/create-task";
import { classifyDocument } from "@/lib/ai/tools/classify-document";
import { extractDocumentData } from "@/lib/ai/tools/extract-document-data";
import { browseAndVerify, createBrowseAndVerify } from "@/lib/ai/tools/browse-and-verify";
import type { BrowserActionCallback } from "@/lib/ai/tools/browse-and-verify";
import { updateDocumentStatus } from "@/lib/ai/tools/update-document-status";
import { getAgentMemoryTool } from "@/lib/ai/tools/get-agent-memory";
import { saveAgentMemoryTool } from "@/lib/ai/tools/save-agent-memory";
import { draftEmail } from "@/lib/ai/tools/draft-email";
import { getCompliancePackages } from "@/lib/ai/tools/get-compliance-packages";
import { getReferenceContactsTool } from "@/lib/ai/tools/get-reference-contacts";
import { initiateVoiceCallTool } from "@/lib/ai/tools/initiate-voice-call";
import { getCallStatusTool } from "@/lib/ai/tools/get-call-status";
import { updateReferenceStatusTool } from "@/lib/ai/tools/update-reference-status";
import { getLocalProfile } from "@/lib/ai/tools/get-local-profile";
import { getLocalCompliance } from "@/lib/ai/tools/get-local-compliance";
import { searchLocalCandidates } from "@/lib/ai/tools/search-local-candidates";

/**
 * Registry of all tools available to agents, keyed by name.
 * Add new tools here as they're created.
 */
const toolRegistry: Record<string, Tool> = {
	getProfile: getProfile as Tool,
	getDocuments: getDocuments as Tool,
	createTask: createTaskTool as Tool,
	classifyDocument: classifyDocument as Tool,
	extractDocumentData: extractDocumentData as Tool,
	browseAndVerify: browseAndVerify as Tool,
	updateDocumentStatus: updateDocumentStatus as Tool,
	getAgentMemory: getAgentMemoryTool as Tool,
	saveAgentMemory: saveAgentMemoryTool as Tool,
	draftEmail: draftEmail as Tool,
	getCompliancePackages: getCompliancePackages as Tool,
	getReferenceContacts: getReferenceContactsTool as Tool,
	initiateVoiceCall: initiateVoiceCallTool as Tool,
	getCallStatus: getCallStatusTool as Tool,
	updateReferenceStatus: updateReferenceStatusTool as Tool,
	getLocalProfile: getLocalProfile as Tool,
	getLocalCompliance: getLocalCompliance as Tool,
	searchLocalCandidates: searchLocalCandidates as Tool,
};

/** Optional callbacks for context-aware tool resolution */
export interface ToolResolverCallbacks {
	/** Called when a browser action occurs during browseAndVerify */
	onBrowserAction?: BrowserActionCallback;
}

/**
 * Resolve a list of tool names to actual tool instances.
 * Returns only tools that exist in the registry.
 *
 * When callbacks are provided, context-aware tools (like browseAndVerify)
 * are created with the callback injected.
 */
export function resolveTools(
	toolNames: string[],
	callbacks?: ToolResolverCallbacks,
): Record<string, Tool> {
	const resolved: Record<string, Tool> = {};

	for (const name of toolNames) {
		// Context-aware factory for browseAndVerify
		if (name === "browseAndVerify" && callbacks?.onBrowserAction) {
			resolved[name] = createBrowseAndVerify(callbacks.onBrowserAction) as Tool;
			continue;
		}

		const tool = toolRegistry[name];
		if (tool) {
			resolved[name] = tool;
		} else {
			console.warn(`[tool-resolver] Unknown tool: "${name}"`);
		}
	}

	return resolved;
}

/**
 * Get all available tool names.
 */
export function getAvailableToolNames(): string[] {
	return Object.keys(toolRegistry);
}

/**
 * Register a new tool in the shared registry.
 */
export function registerTool(name: string, tool: Tool): void {
	toolRegistry[name] = tool;
}

/** Metadata for a tool — safe to pass to client components. */
export interface ToolMetadata {
	name: string;
	description: string;
}

/**
 * Get metadata for all registered tools.
 * Extracts the first line of each tool's description for display.
 */
export function getToolMetadata(): ToolMetadata[] {
	return Object.entries(toolRegistry).map(([name, t]) => {
		const raw = (t as { description?: string }).description ?? "";
		// Take first sentence or line as short description
		const firstLine = raw.split("\n")[0].trim();
		return { name, description: firstLine };
	});
}
