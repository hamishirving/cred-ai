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
import {
	browseAndVerify,
	createBrowseAndVerify,
} from "@/lib/ai/tools/browse-and-verify";
import type { BrowserActionCallback } from "@/lib/ai/tools/browse-and-verify";
import {
	dvlaBrowseVerify,
	createDvlaBrowseVerify,
} from "@/lib/ai/tools/dvla-browse-verify";
import {
	gdcBrowseVerify,
	createGdcBrowseVerify,
} from "@/lib/ai/tools/gdc-browse-verify";
import {
	bonBrowseVerify,
	createBonBrowseVerify,
} from "@/lib/ai/tools/bon-browse-verify";
import { updateDocumentStatus } from "@/lib/ai/tools/update-document-status";
import { getAgentMemoryTool } from "@/lib/ai/tools/get-agent-memory";
import { saveAgentMemoryTool } from "@/lib/ai/tools/save-agent-memory";
import { draftEmail } from "@/lib/ai/tools/draft-email";
import { sendSms } from "@/lib/ai/tools/send-sms";
import { getCompliancePackages } from "@/lib/ai/tools/get-compliance-packages";
import { getReferenceContactsTool } from "@/lib/ai/tools/get-reference-contacts";
import { initiateVoiceCallTool } from "@/lib/ai/tools/initiate-voice-call";
import { getCallStatusTool } from "@/lib/ai/tools/get-call-status";
import { updateReferenceStatusTool } from "@/lib/ai/tools/update-reference-status";
import { getLocalProfile } from "@/lib/ai/tools/get-local-profile";
import { getLocalCompliance } from "@/lib/ai/tools/get-local-compliance";
import { searchLocalCandidates } from "@/lib/ai/tools/search-local-candidates";
import {
	createSearchKnowledge,
	searchKnowledge,
} from "@/lib/ai/tools/search-knowledge";
import { updateLocalProfile } from "@/lib/ai/tools/update-local-profile";
import { resolvePlacementRequirementsTool } from "@/lib/ai/tools/resolve-placement-requirements";
import { getPlacementComplianceTool } from "@/lib/ai/tools/get-placement-compliance";
import { faGetPackages } from "@/lib/ai/tools/fa-get-packages";
import { faCreateCandidate } from "@/lib/ai/tools/fa-create-candidate";
import { faInitiateScreening } from "@/lib/ai/tools/fa-initiate-screening";
import { faCheckScreening } from "@/lib/ai/tools/fa-check-screening";
import { faGetReport } from "@/lib/ai/tools/fa-get-report";
import { faSelectPackage } from "@/lib/ai/tools/fa-select-package";
import { faListScreenings } from "@/lib/ai/tools/fa-list-screenings";
import { createEscalation } from "@/lib/ai/tools/create-escalation";
import {
	storeAttachment,
	createStoreAttachment,
} from "@/lib/ai/tools/store-attachment";
import type { EmailAttachment } from "@/lib/ai/tools/store-attachment";
import { uploadDocumentEvidence } from "@/lib/ai/tools/upload-document-evidence";
import { verifyDocumentEvidence } from "@/lib/ai/tools/verify-document-evidence";
import { initiateFollowupVoiceCallTool } from "@/lib/ai/tools/initiate-followup-voice-call";
import { applyFollowupVoiceOutcomeTool } from "@/lib/ai/tools/apply-followup-voice-outcome";

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
	dvlaBrowseVerify: dvlaBrowseVerify as Tool,
	gdcBrowseVerify: gdcBrowseVerify as Tool,
	bonBrowseVerify: bonBrowseVerify as Tool,
	updateDocumentStatus: updateDocumentStatus as Tool,
	getAgentMemory: getAgentMemoryTool as Tool,
	saveAgentMemory: saveAgentMemoryTool as Tool,
	draftEmail: draftEmail as Tool,
	sendSms: sendSms as Tool,
	getCompliancePackages: getCompliancePackages as Tool,
	getReferenceContacts: getReferenceContactsTool as Tool,
	initiateVoiceCall: initiateVoiceCallTool as Tool,
	getCallStatus: getCallStatusTool as Tool,
	updateReferenceStatus: updateReferenceStatusTool as Tool,
	getLocalProfile: getLocalProfile as Tool,
	getLocalCompliance: getLocalCompliance as Tool,
	searchLocalCandidates: searchLocalCandidates as Tool,
	searchKnowledge: searchKnowledge as Tool,
	updateLocalProfile: updateLocalProfile as Tool,
	resolvePlacementRequirements: resolvePlacementRequirementsTool as Tool,
	getPlacementCompliance: getPlacementComplianceTool as Tool,
	faGetPackages: faGetPackages as Tool,
	faCreateCandidate: faCreateCandidate as Tool,
	faInitiateScreening: faInitiateScreening as Tool,
	faCheckScreening: faCheckScreening as Tool,
	faGetReport: faGetReport as Tool,
	faSelectPackage: faSelectPackage as Tool,
	faListScreenings: faListScreenings as Tool,
	createEscalation: createEscalation as Tool,
	storeAttachment: storeAttachment as Tool,
	uploadDocumentEvidence: uploadDocumentEvidence as Tool,
	verifyDocumentEvidence: verifyDocumentEvidence as Tool,
	initiateFollowupVoiceCall: initiateFollowupVoiceCallTool as Tool,
	applyFollowupVoiceOutcome: applyFollowupVoiceOutcomeTool as Tool,
};

/** Optional callbacks and context for tool resolution */
export interface ToolResolverCallbacks {
	/** Called when a browser action occurs during browseAndVerify */
	onBrowserAction?: BrowserActionCallback;
	/** Email attachments — when present, storeAttachment uses the index-based factory */
	attachments?: EmailAttachment[];
	/** Organisation context for tools that need tenant-aware routing */
	organisationId?: string;
	/** Agent ID for context-aware browser evidence capture */
	agentId?: string;
	/** Execution ID for context-aware browser evidence capture */
	executionId?: string;
	/** Original execution input for context-aware browser tools */
	executionInput?: Record<string, unknown>;
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
			resolved[name] = createBrowseAndVerify({
				onAction: callbacks.onBrowserAction,
				agentId: callbacks.agentId,
				executionId: callbacks.executionId,
				organisationId: callbacks.organisationId,
				executionInput: callbacks.executionInput,
			}) as Tool;
			continue;
		}

		// Context-aware factory for dvlaBrowseVerify
		if (name === "dvlaBrowseVerify" && callbacks?.onBrowserAction) {
			resolved[name] = createDvlaBrowseVerify(
				callbacks.onBrowserAction,
			) as Tool;
			continue;
		}

		// Context-aware factory for gdcBrowseVerify
		if (name === "gdcBrowseVerify" && callbacks?.onBrowserAction) {
			resolved[name] = createGdcBrowseVerify(callbacks.onBrowserAction) as Tool;
			continue;
		}

		// Context-aware factory for bonBrowseVerify
		if (name === "bonBrowseVerify" && callbacks?.onBrowserAction) {
			resolved[name] = createBonBrowseVerify(callbacks.onBrowserAction) as Tool;
			continue;
		}

		// Context-aware factory for storeAttachment — uses index-based variant
		// when attachments are available so base64 data stays out of the prompt
		if (
			name === "storeAttachment" &&
			callbacks?.attachments &&
			callbacks.attachments.length > 0
		) {
			resolved[name] = createStoreAttachment(callbacks.attachments) as Tool;
			continue;
		}

		// Context-aware factory for searchKnowledge to route Ragie partition by org
		if (name === "searchKnowledge" && callbacks?.organisationId) {
			resolved[name] = createSearchKnowledge(callbacks.organisationId) as Tool;
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
