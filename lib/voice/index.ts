/**
 * Voice AI Module
 *
 * Public API for voice call functionality.
 */

// Types
export type {
	FieldSchema,
	FieldType,
	VoiceTemplate,
	VoiceTemplateUI,
	VoiceCallStatus,
	VoiceCallOutcome,
	TranscriptMessage,
	CreateVoiceCallRequest,
	CreateVoiceCallResponse,
	VoiceCallStatusResponse,
	VoiceCallDetailResponse,
	VoiceCallListResponse,
} from "./types";

// Templates
export {
	templates,
	getTemplate,
	listTemplates,
	templateExists,
	validateContext,
} from "./templates";

// VAPI Client
export {
	initiateCall,
	getCallStatus,
	isValidPhoneNumber,
	isVapiConfigured,
	getMissingConfig,
} from "./vapi-client";
