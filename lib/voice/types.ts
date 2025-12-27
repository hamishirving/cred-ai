/**
 * Voice AI Types
 *
 * Generic type definitions for the voice communication channel.
 * These types support dynamic templates for different use cases.
 */

// ============================================
// Field Schema - Defines dynamic form fields
// ============================================

export type FieldType =
	| "string"
	| "date"
	| "phone"
	| "email"
	| "boolean"
	| "select";

export interface FieldSchema {
	key: string;
	label: string;
	type: FieldType;
	required?: boolean;
	options?: string[]; // For select type
	description?: string; // Help text
}

// ============================================
// Voice Template - Defines a type of call
// ============================================

export interface VoiceTemplateUI {
	buttonLabel?: string;
	successMessage?: string;
	icon?: string;
}

export interface VoiceTemplate {
	slug: string;
	name: string;
	description: string;
	vapiAssistantId: string;

	// Fields the caller must provide (injected as VAPI variables)
	contextSchema: FieldSchema[];

	// Fields the agent will try to capture
	captureSchema: FieldSchema[];

	// Optional UI customization
	ui?: VoiceTemplateUI;
}

// ============================================
// Voice Call Status
// ============================================

export type VoiceCallStatus =
	| "pending" // Created, not yet sent to VAPI
	| "queued" // VAPI has queued the call
	| "ringing" // Phone is ringing
	| "in-progress" // Call connected
	| "ended" // Call completed
	| "failed"; // Call failed

export type VoiceCallOutcome =
	| "completed"
	| "no_answer"
	| "busy"
	| "failed"
	| "voicemail";

// ============================================
// Transcript
// ============================================

export interface TranscriptMessage {
	role: "assistant" | "user";
	content: string;
	timestamp?: number;
}

// ============================================
// Voice Call - API Request/Response Types
// ============================================

export interface CreateVoiceCallRequest {
	templateSlug: string;
	phoneNumber: string;
	recipientName?: string;
	context: Record<string, unknown>;
}

export interface CreateVoiceCallResponse {
	success: true;
	call: {
		id: string;
		status: VoiceCallStatus;
	};
}

export interface VoiceCallStatusResponse {
	id: string;
	status: VoiceCallStatus;
	duration?: number;
	outcome?: VoiceCallOutcome;
	recordingUrl?: string;
	transcript?: TranscriptMessage[];
	capturedData?: Record<string, unknown>;
}

export interface VoiceCallDetailResponse {
	id: string;
	templateSlug: string;
	phoneNumber: string;
	recipientName?: string;
	context: Record<string, unknown>;
	capturedData?: Record<string, unknown>;
	status: VoiceCallStatus;
	outcome?: VoiceCallOutcome;
	recordingUrl?: string;
	transcript?: TranscriptMessage[];
	duration?: number;
	createdAt: string;
	startedAt?: string;
	endedAt?: string;
}

export interface VoiceCallListResponse {
	calls: VoiceCallDetailResponse[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

// ============================================
// VAPI Types (external service)
// ============================================

export interface VapiCallParams {
	assistantId: string;
	phoneNumberId: string;
	customerNumber: string;
	variableValues: Record<string, string>;
}

export interface VapiCallResponse {
	id: string;
	status: string;
	// Additional VAPI fields as needed
}

export interface VapiCallStatus {
	id: string;
	status: string;
	endedReason?: string;
	recordingUrl?: string;
	transcript?: string;
	structuredData?: Record<string, unknown>;
	messages?: Array<{
		role: string;
		content: string;
		time?: number;
	}>;
}
