/**
 * AI Agent Type Definitions
 *
 * Core type definitions for both:
 * - The agent execution system (AgentDefinition, AgentStep, etc.)
 * - The AI Agent Platform (Agent, AgentContext, AgentInsight, etc.)
 *
 * @see docs/PRD-AI-AGENTS.md for architecture details
 */

import type { z } from "zod";

// ============================================
// Agent Execution System Types
// ============================================

/**
 * An agent definition — static config that describes what an agent can do.
 */
export interface AgentDefinition {
	/** Unique identifier (e.g. "verify-bls-certificate") */
	id: string;
	/** Human-readable name */
	name: string;
	/** What this agent does */
	description: string;
	/** Agent version for tracking */
	version: string;

	/** Layer 3 prompt — agent-specific instructions */
	systemPrompt: string;

	/** Tool names this agent can access (subset of all available tools) */
	tools: string[];

	/** Input schema — what the user provides to invoke the agent */
	inputSchema: z.ZodObject<z.ZodRawShape>;

	/** Execution constraints */
	constraints: {
		/** Max agent steps (maps to AI SDK stopWhen) */
		maxSteps: number;
		/** Timeout in ms */
		maxExecutionTime: number;
	};

	/** Trigger config (for display; playground is manual only) */
	trigger: {
		type: "schedule" | "event" | "manual";
		description: string;
	};

	/** Oversight config */
	oversight: {
		mode: "auto" | "review-before" | "notify-after";
	};

	/** Optional function to assemble dynamic context (Layer 4) */
	dynamicContext?: (ctx: AgentExecutionContext) => Promise<string>;
}

/**
 * Context provided when executing an agent.
 */
export interface AgentExecutionContext {
	/** Input values from the user (matches inputSchema) */
	input: Record<string, unknown>;
	/** Organisation ID */
	orgId: string;
	/** Organisation-level AI prompt (Layer 2) */
	orgPrompt?: string;
	/** User who triggered the execution */
	userId: string;
	/** Pre-loaded memory from previous runs (if available) */
	memory?: {
		data: Record<string, unknown>;
		runCount: number;
		lastRunAt: Date | null;
	};
	/** How this execution was triggered */
	triggerType?: "manual" | "schedule" | "event";
}

/**
 * A captured step from the agent's execution.
 */
export interface AgentStep {
	/** Step index (1-based) */
	index: number;
	/** Step type */
	type: "tool-call" | "reasoning" | "text";
	/** Tool name (if tool-call) */
	toolName?: string;
	/** Tool input (if tool-call) */
	toolInput?: Record<string, unknown>;
	/** Tool output (if tool-call) */
	toolOutput?: unknown;
	/** Text content (if reasoning/text) */
	content?: string;
	/** Step duration in ms */
	durationMs?: number;
	/** When this step occurred */
	timestamp: string;
}

/**
 * Serialisable agent data for passing from server to client components.
 * Strips Zod schema and functions, replaces with plain field metadata.
 */
export interface SerializedAgentDefinition {
	id: string;
	name: string;
	description: string;
	version: string;
	systemPrompt: string;
	tools: string[];
	/** Input field metadata extracted from the Zod schema */
	inputFields: Array<{
		key: string;
		label: string;
		description: string;
		required: boolean;
		defaultValue?: string;
	}>;
	constraints: {
		maxSteps: number;
		maxExecutionTime: number;
	};
	trigger: {
		type: "schedule" | "event" | "manual";
		description: string;
	};
	oversight: {
		mode: "auto" | "review-before" | "notify-after";
	};
}

/**
 * A browser action emitted in real-time during a browseAndVerify step.
 */
export interface BrowserAction {
	/** Action index within the browser step */
	index: number;
	/** What the agent did */
	type: string;
	/** Agent's reasoning for this action */
	reasoning?: string;
	/** Specific action taken (e.g. "click", "type", "goto") */
	action?: string;
	/** When this action occurred */
	timestamp: string;
}

/**
 * Final result from an agent execution.
 */
export interface AgentExecutionResult {
	/** Execution status */
	status: "completed" | "failed" | "escalated";
	/** Summary text from the agent */
	summary: string;
	/** All steps taken */
	steps: AgentStep[];
	/** Token usage */
	usage: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	};
	/** Total duration in ms */
	durationMs: number;
}

// ============================================
// AI Agent Platform Types (Compliance Companion)
// ============================================

// ============================================
// Audience Types
// ============================================

/**
 * Who can receive insights from agents.
 */
export type AudienceType =
	| "candidate"
	| "compliance_manager"
	| "recruiter"
	| "admin";

// ============================================
// Agent Trigger Types
// ============================================

/**
 * What triggers an agent to run.
 */
export interface AgentTrigger {
	type: "scheduled" | "event" | "manual";
	config: {
		/** Cron expression for scheduled triggers */
		schedule?: string;
		/** Event name for event-triggered agents */
		eventType?: string;
	};
}

// ============================================
// Agent Context
// ============================================

/**
 * Context provided to agents when they run.
 * Contains all the data an agent needs to analyze and produce insights.
 */
export interface AgentContext {
	organisationId: string;
	orgSettings: OrgAISettings;

	/** Candidates to analyze (for compliance-related agents) */
	candidates?: CandidateContext[];

	/** Previous activities for context (avoid repetition) */
	recentActivities?: ActivityContext[];

	/** Current date for relative calculations */
	runDate: Date;
}

/**
 * Candidate data for agent analysis.
 */
export interface CandidateContext {
	profileId: string;
	firstName: string;
	lastName: string;
	email: string;

	/** Role they're onboarding for */
	role?: {
		id: string;
		name: string;
	};

	/** Placement details if assigned */
	placement?: {
		id: string;
		workNodeName: string;
		startDate?: Date;
	};

	/** Compliance status */
	compliance: {
		completed: number;
		total: number;
		percentage: number;
		items: ComplianceItemContext[];
	};

	/** Days since profile created */
	daysInOnboarding: number;

	/** Days since last activity related to this candidate */
	daysSinceLastActivity: number;
}

/**
 * Individual compliance item with blocking analysis.
 */
export interface ComplianceItemContext {
	elementId: string;
	elementName: string;
	elementSlug: string;

	/** Current status of this compliance item */
	status: "complete" | "pending" | "expired" | "rejected";

	/** Who is responsible for the next action */
	blockedBy: BlockedBy;

	/** Reason for the blocking status */
	blockingReason: string;

	/** What action is required (if any) */
	actionRequired?: string;

	/** Expiry date if applicable */
	expiresAt?: Date;
}

/**
 * Who is currently blocking progress on an item.
 */
export type BlockedBy = "candidate" | "admin" | "third_party" | "complete";

/**
 * Recent activity context for avoiding repetition.
 */
export interface ActivityContext {
	id: string;
	activityType: string;
	channel?: string;
	createdAt: Date;
	summary?: string;
}

// ============================================
// Organisation AI Settings
// ============================================

/**
 * AI Companion settings at org level.
 */
export interface OrgAISettings {
	/** Whether AI companion is enabled */
	enabled: boolean;

	/** Custom org voice/tone instructions */
	orgPrompt?: string;

	/** How often to send candidate emails */
	emailFrequency: "daily" | "every_2_days" | "weekly";

	/** Time to send emails (24h format, e.g., "09:00") */
	sendTime: string;

	/** Timezone for scheduling (e.g., "Europe/London") */
	timezone: string;

	/** Compliance contact for sign-off */
	complianceContact?: {
		name: string;
		email: string;
		phone?: string;
	};

	/** Support contact for escalations */
	supportContact?: {
		email: string;
		phone?: string;
	};
}

// ============================================
// Agent Insights
// ============================================

/**
 * Priority levels for insights.
 */
export type InsightPriority = "low" | "medium" | "high" | "urgent";

/**
 * Categories of insights.
 */
export type InsightCategory =
	| "progress" // Routine update
	| "blocker" // Something is stuck
	| "expiry" // Something is expiring/expired
	| "action_required" // Action needed
	| "celebration"; // Milestone achieved

/**
 * What the insight is about.
 */
export type InsightSubjectType =
	| "profile"
	| "placement"
	| "evidence"
	| "escalation";

/**
 * Insight routed to a specific audience.
 */
export interface AudienceInsight {
	audienceType: AudienceType;

	/** Specific recipient ID (null = role-based routing) */
	recipientId?: string;

	/** Which channels to use for this audience */
	channels: ChannelType[];
}

/**
 * Channel types for delivery.
 */
export type ChannelType = "email" | "task" | "notification" | "sms" | "voice";

/**
 * The primary output of an agent - a structured insight.
 */
export interface AgentInsight {
	id: string;
	agentId: string;

	/** What is this insight about */
	subjectType: InsightSubjectType;
	subjectId: string;

	/** Who should receive this insight */
	audiences: AudienceInsight[];

	/** Classification */
	priority: InsightPriority;
	category: InsightCategory;

	/** The insight content (structured) */
	summary: string;
	details: Record<string, unknown>;

	/** AI-generated content for each channel (lazy-loaded/cached) */
	content?: {
		email?: EmailContent;
		task?: TaskContent;
		notification?: NotificationContent;
	};

	/** AI reasoning for transparency */
	reasoning?: string;

	/** When to deliver (for batching) */
	deliverAt?: Date;

	createdAt: Date;
}

/**
 * Email content structure.
 */
export interface EmailContent {
	subject: string;
	body: string;
	html?: string;
}

/**
 * Task content structure.
 */
export interface TaskContent {
	title: string;
	description: string;
	priority: InsightPriority;
	dueDate?: Date;
	linkedEntity?: {
		type: InsightSubjectType;
		id: string;
	};
}

/**
 * Notification content structure.
 */
export interface NotificationContent {
	title: string;
	body: string;
	actionUrl?: string;
}

// ============================================
// Agent Definition
// ============================================

/**
 * An AI Agent that analyzes context and produces insights.
 */
export interface Agent {
	/** Unique identifier for this agent */
	id: string;

	/** Human-readable name */
	name: string;

	/** Description of what this agent does */
	description: string;

	/** What triggers this agent to run */
	triggers: AgentTrigger[];

	/** Who this agent can produce insights for */
	audiences: AudienceType[];

	/** Run the agent and produce insights */
	run(context: AgentContext): Promise<AgentInsight[]>;
}

// ============================================
// Orchestrator Types
// ============================================

/**
 * Result of running the orchestrator.
 */
export interface OrchestratorResult {
	/** All insights produced by agents */
	insights: AgentInsight[];

	/** Results of delivering insights */
	deliveries: DeliveryResult[];

	/** Summary statistics */
	summary: {
		agentsRun: number;
		insightsProduced: number;
		deliveriesAttempted: number;
		deliveriesSucceeded: number;
	};
}

/**
 * Result of delivering content via a channel.
 */
export interface DeliveryResult {
	insightId: string;
	audienceType: AudienceType;
	channelType: ChannelType;
	status: "delivered" | "preview" | "failed" | "skipped";
	error?: string;

	/** Channel-specific result data */
	data?: {
		messageId?: string;
		taskId?: string;
		notificationId?: string;
	};
}
