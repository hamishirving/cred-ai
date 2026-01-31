/**
 * Skill Framework Types
 *
 * Core type definitions for the skill execution system.
 * Skills are autonomous AI agents defined by a prompt, tools, and config.
 */

import type { z } from "zod";

/**
 * A skill definition — static config that describes what an agent can do.
 */
export interface SkillDefinition {
	/** Unique identifier (e.g. "verify-bls-certificate") */
	id: string;
	/** Human-readable name */
	name: string;
	/** What this skill does */
	description: string;
	/** Skill version for tracking */
	version: string;

	/** Layer 3 prompt — skill-specific instructions */
	systemPrompt: string;

	/** Tool names this skill can access (subset of all available tools) */
	tools: string[];

	/** Input schema — what the user provides to invoke the skill */
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
	dynamicContext?: (ctx: SkillExecutionContext) => Promise<string>;
}

/**
 * Context provided when executing a skill.
 */
export interface SkillExecutionContext {
	/** Input values from the user (matches inputSchema) */
	input: Record<string, unknown>;
	/** Organisation ID */
	orgId: string;
	/** Organisation-level AI prompt (Layer 2) */
	orgPrompt?: string;
	/** User who triggered the execution */
	userId: string;
}

/**
 * A captured step from the agent's execution.
 */
export interface SkillStep {
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
 * Serialisable skill data for passing from server to client components.
 * Strips Zod schema and functions, replaces with plain field metadata.
 */
export interface SerializedSkillDefinition {
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
 * Final result from a skill execution.
 */
export interface SkillExecutionResult {
	/** Execution status */
	status: "completed" | "failed" | "escalated";
	/** Summary text from the agent */
	summary: string;
	/** All steps taken */
	steps: SkillStep[];
	/** Token usage */
	usage: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	};
	/** Total duration in ms */
	durationMs: number;
}
