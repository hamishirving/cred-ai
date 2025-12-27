/**
 * VAPI Client Wrapper
 *
 * Provides a typed interface for interacting with the VAPI voice AI service.
 * Handles call initiation, status polling, and result extraction.
 */

import { VapiClient } from "@vapi-ai/server-sdk";
import type {
	TranscriptMessage,
	VoiceCallStatus,
	VoiceCallOutcome,
} from "./types";

// ============================================
// Configuration
// ============================================

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;

function getVapiClient(): VapiClient {
	if (!VAPI_API_KEY) {
		throw new Error("VAPI_API_KEY environment variable is not set");
	}
	return new VapiClient({ token: VAPI_API_KEY });
}

// ============================================
// Types
// ============================================

export interface InitiateCallParams {
	assistantId: string;
	phoneNumber: string;
	variables: Record<string, string>;
}

export interface InitiateCallResult {
	success: true;
	vapiCallId: string;
}

export interface CallStatusResult {
	status: VoiceCallStatus;
	outcome?: VoiceCallOutcome;
	duration?: number;
	recordingUrl?: string;
	transcript?: TranscriptMessage[];
	capturedData?: Record<string, unknown>;
}

// ============================================
// Call Initiation
// ============================================

/**
 * Initiate an outbound call via VAPI
 */
export async function initiateCall(
	params: InitiateCallParams,
): Promise<InitiateCallResult> {
	if (!VAPI_PHONE_NUMBER_ID) {
		throw new Error("VAPI_PHONE_NUMBER_ID environment variable is not set");
	}

	const vapi = getVapiClient();

	const call = await vapi.calls.create({
		assistantId: params.assistantId,
		assistantOverrides: {
			variableValues: params.variables,
		},
		customer: {
			number: params.phoneNumber,
		},
		phoneNumberId: VAPI_PHONE_NUMBER_ID,
	});

	// Handle response - can be Call or CallBatchResponse
	const callId = "id" in call ? call.id : undefined;

	if (!callId) {
		throw new Error("Failed to get call ID from VAPI response");
	}

	return {
		success: true,
		vapiCallId: callId,
	};
}

// ============================================
// Call Status
// ============================================

/**
 * Map VAPI status string to our VoiceCallStatus type
 */
function mapVapiStatus(vapiStatus: string): VoiceCallStatus {
	switch (vapiStatus) {
		case "queued":
			return "queued";
		case "ringing":
			return "ringing";
		case "in-progress":
			return "in-progress";
		case "ended":
			return "ended";
		case "failed":
			return "failed";
		default:
			// For unknown statuses, default to pending
			return "pending";
	}
}

/**
 * Map VAPI ended reason to our VoiceCallOutcome type
 */
function mapVapiOutcome(endedReason?: string): VoiceCallOutcome | undefined {
	if (!endedReason) return undefined;

	// Common VAPI ended reasons
	switch (endedReason) {
		case "assistant-ended-call":
		case "customer-ended-call":
		case "silence-timed-out":
		case "max-duration-reached":
			return "completed";
		case "no-answer":
			return "no_answer";
		case "busy":
			return "busy";
		case "voicemail":
		case "answering-machine":
			return "voicemail";
		case "failed":
		case "error":
		case "assistant-error":
		case "assistant-request-failed":
			return "failed";
		default:
			return "completed";
	}
}

/**
 * Parse VAPI transcript messages into our format
 * Filters out system prompts and only includes actual conversation
 */
function parseTranscript(
	messages?: Array<{
		role?: string;
		message?: string;
		content?: string;
		time?: number;
	}>,
): TranscriptMessage[] | undefined {
	if (!messages || messages.length === 0) return undefined;

	return messages
		.filter((m) => {
			// Only include assistant and user messages with actual content
			if (!m.role || (!m.message && !m.content)) return false;
			// Exclude system messages (prompts, tool calls, etc.)
			if (m.role === "system" || m.role === "tool_calls" || m.role === "tool_call_result") return false;
			return true;
		})
		.map((m) => ({
			role: m.role === "assistant" ? "assistant" : "user",
			content: m.message || m.content || "",
			timestamp: m.time,
		}));
}

/**
 * Get the current status of a call from VAPI
 */
export async function getCallStatus(
	vapiCallId: string,
): Promise<CallStatusResult> {
	const vapi = getVapiClient();

	const call = await vapi.calls.get({ id: vapiCallId });

	const status = mapVapiStatus(call.status || "pending");
	const result: CallStatusResult = {
		status,
	};

	// Only include additional data if call has ended
	if (status === "ended" && call.artifact) {
		result.outcome = mapVapiOutcome(call.endedReason);
		result.recordingUrl = call.artifact.recordingUrl;
		result.transcript = parseTranscript(
			call.artifact.messages as Array<{
				role?: string;
				message?: string;
				content?: string;
				time?: number;
			}>,
		);

		// VAPI can return structured data in multiple places:
		// 1. artifact.structuredOutputs - from function calls/tools
		// 2. analysis - from post-call analysis (if configured)
		const structuredOutputs = call.artifact.structuredOutputs as Record<string, unknown> | undefined;
		const analysis = (call as unknown as { analysis?: Record<string, unknown> }).analysis;

		// Debug: log what VAPI returns so we can see where structured data lives
		if (process.env.NODE_ENV === "development") {
			console.log("[VAPI] Call artifact keys:", Object.keys(call.artifact));
			console.log("[VAPI] structuredOutputs:", structuredOutputs);
			console.log("[VAPI] analysis:", analysis);
		}

		result.capturedData = structuredOutputs || analysis || undefined;
	}

	// Calculate duration if available
	if (call.startedAt && call.endedAt) {
		const startTime = new Date(call.startedAt).getTime();
		const endTime = new Date(call.endedAt).getTime();
		result.duration = Math.round((endTime - startTime) / 1000);
	}

	return result;
}

// ============================================
// Validation
// ============================================

/**
 * Validate E.164 phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
	return /^\+[1-9]\d{1,14}$/.test(phone);
}

/**
 * Check if VAPI is properly configured
 */
export function isVapiConfigured(): boolean {
	return !!(VAPI_API_KEY && VAPI_PHONE_NUMBER_ID);
}

/**
 * Get missing VAPI configuration
 */
export function getMissingConfig(): string[] {
	const missing: string[] = [];
	if (!VAPI_API_KEY) missing.push("VAPI_API_KEY");
	if (!VAPI_PHONE_NUMBER_ID) missing.push("VAPI_PHONE_NUMBER_ID");
	return missing;
}
