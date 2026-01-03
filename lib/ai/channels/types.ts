/**
 * Channel Type Definitions
 *
 * Channels are the delivery mechanism for agent insights.
 * They format insights for specific mediums and handle delivery.
 *
 * @see docs/PRD-AI-AGENTS.md for architecture details
 */

import type {
	AgentInsight,
	AudienceInsight,
	AudienceType,
	ChannelType,
	EmailContent,
	NotificationContent,
	TaskContent,
} from "../agents/types";

// ============================================
// Channel Content Types
// ============================================

/**
 * Base content interface for all channels.
 */
export interface BaseChannelContent {
	type: ChannelType;
}

/**
 * Formatted email ready for delivery.
 */
export interface FormattedEmailContent extends BaseChannelContent {
	type: "email";
	to: string;
	cc?: string[];
	subject: string;
	body: string;
	html?: string;
	replyTo?: string;
}

/**
 * Formatted task ready for creation.
 */
export interface FormattedTaskContent extends BaseChannelContent {
	type: "task";
	organisationId: string;
	assigneeId?: string;
	assigneeRole?: string;
	subjectType: "profile" | "placement" | "evidence" | "escalation";
	subjectId: string;
	title: string;
	description: string;
	priority: "low" | "medium" | "high" | "urgent";
	dueAt?: Date;
	agentId: string;
	insightId: string;
}

/**
 * Formatted notification ready for creation.
 */
export interface FormattedNotificationContent extends BaseChannelContent {
	type: "notification";
	recipientId?: string;
	recipientRole?: string;
	title: string;
	body: string;
	actionUrl?: string;
	priority: "low" | "medium" | "high";
}

/**
 * Union type for all channel content.
 */
export type ChannelContent =
	| FormattedEmailContent
	| FormattedTaskContent
	| FormattedNotificationContent;

// ============================================
// Delivery Options
// ============================================

/**
 * Options for delivering content.
 */
export interface DeliverOptions {
	/** If true, don't actually send - just return preview */
	preview: boolean;

	/** Override recipient for testing */
	recipientOverride?: string;

	/** Organisation context */
	organisationId: string;
}

/**
 * Result of a delivery attempt.
 */
export interface ChannelDeliveryResult {
	status: "delivered" | "preview" | "failed" | "skipped";
	error?: string;

	/** The content that was (or would be) delivered */
	content: ChannelContent;

	/** Channel-specific result data */
	data?: {
		/** Email message ID if sent */
		messageId?: string;
		/** Task ID if created */
		taskId?: string;
		/** Notification ID if created */
		notificationId?: string;
	};
}

// ============================================
// Channel Definition
// ============================================

/**
 * A Channel handles formatting and delivery for a specific medium.
 */
export interface Channel {
	/** The type of this channel */
	type: ChannelType;

	/** Human-readable name */
	name: string;

	/** Description of this channel */
	description: string;

	/**
	 * Check if this channel can reach the given audience type.
	 * E.g., email can reach candidates, but not internal staff in MVP.
	 */
	supportsAudience(audience: AudienceType): boolean;

	/**
	 * Format an insight for this channel.
	 * May use AI to generate content if not already cached on the insight.
	 */
	format(
		insight: AgentInsight,
		audience: AudienceInsight,
		options: FormatOptions,
	): Promise<ChannelContent>;

	/**
	 * Deliver (or preview) the formatted content.
	 */
	deliver(
		content: ChannelContent,
		options: DeliverOptions,
	): Promise<ChannelDeliveryResult>;
}

/**
 * Options for formatting content.
 */
export interface FormatOptions {
	/** Organisation ID for context */
	organisationId: string;

	/** Organisation name for content */
	orgName: string;

	/** Org-specific AI prompt/voice */
	orgPrompt?: string;

	/** Compliance contact for sign-off */
	complianceContact?: {
		name: string;
		email: string;
		phone?: string;
	};
}

// ============================================
// Channel Registry Types
// ============================================

/**
 * Registry for managing channels.
 */
export interface ChannelRegistry {
	/** Get a channel by type */
	get(type: ChannelType): Channel | undefined;

	/** Get all registered channels */
	getAll(): Channel[];

	/** Get channels that support a given audience */
	getForAudience(audience: AudienceType): Channel[];

	/** Register a channel */
	register(channel: Channel): void;
}

// ============================================
// Email Channel Specifics
// ============================================

/**
 * Context for generating email content.
 */
export interface EmailGenerationContext {
	candidateName: string;
	candidateEmail: string;
	orgName: string;
	complianceContact?: {
		name: string;
		email: string;
		phone?: string;
	};
	orgPrompt?: string;
	compliance: {
		completed: number;
		total: number;
		percentage: number;
		blockedByCandidate: { name: string; action: string }[];
		blockedByAdmin: { name: string; reason: string }[];
		blockedByThirdParty: { name: string; reason: string }[];
	};
	startDate?: Date;
	daysInOnboarding: number;
	daysSinceLastEmail: number;
	insightCategory: string;
	insightPriority: string;
}

// ============================================
// Task Channel Specifics
// ============================================

/**
 * Context for generating task content.
 */
export interface TaskGenerationContext {
	subjectName: string;
	subjectType: string;
	subjectId: string;
	insightSummary: string;
	insightPriority: string;
	insightCategory: string;
	actionRequired?: string;
	dueDate?: Date;
}

// ============================================
// Notification Channel Specifics
// ============================================

/**
 * Context for generating notification content.
 */
export interface NotificationGenerationContext {
	title: string;
	body: string;
	subjectType: string;
	subjectId: string;
	priority: string;
	actionUrl?: string;
}
