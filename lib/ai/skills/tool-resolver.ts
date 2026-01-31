/**
 * Tool Resolver
 *
 * Maps skill tool name strings to actual tool instances from the shared registry.
 * Skills declare tools by name; this resolves them to executable tool objects.
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

/**
 * Registry of all tools available to skills, keyed by name.
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
 * Register a new tool in the shared registry.
 */
export function registerTool(name: string, tool: Tool): void {
	toolRegistry[name] = tool;
}
