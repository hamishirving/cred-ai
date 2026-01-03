/**
 * Channel System
 *
 * Manages the delivery of agent insights through various channels
 * (email, tasks, notifications).
 *
 * @see docs/PRD-AI-AGENTS.md#channel-system
 */

import type { AgentInsight, AudienceInsight, ChannelType } from "../agents/types";
import type {
	Channel,
	ChannelDeliveryResult,
	ChannelRegistry,
	DeliverOptions,
	FormatOptions,
} from "./types";
import { taskChannel } from "./task";

// ============================================
// Channel Registry
// ============================================

const channels = new Map<ChannelType, Channel>();

/**
 * Register all available channels
 */
function initializeChannels() {
	channels.set("task", taskChannel);
	// Email and notification channels will be added later
}

// Initialize on module load
initializeChannels();

/**
 * Channel Registry implementation
 */
export const channelRegistry: ChannelRegistry = {
	get(type: ChannelType): Channel | undefined {
		return channels.get(type);
	},

	getAll(): Channel[] {
		return Array.from(channels.values());
	},

	getForAudience(audience): Channel[] {
		return Array.from(channels.values()).filter((c) =>
			c.supportsAudience(audience),
		);
	},

	register(channel: Channel): void {
		channels.set(channel.type, channel);
	},
};

// ============================================
// Dispatcher
// ============================================

/**
 * Result of dispatching an insight
 */
export interface DispatchResult {
	insightId: string;
	deliveries: {
		audience: AudienceInsight;
		channel: ChannelType;
		result: ChannelDeliveryResult;
	}[];
	errors: string[];
}

/**
 * Dispatch an insight to all its audiences through their channels.
 */
export async function dispatchInsight(
	insight: AgentInsight,
	formatOptions: FormatOptions,
	deliverOptions: DeliverOptions,
): Promise<DispatchResult> {
	const result: DispatchResult = {
		insightId: insight.id,
		deliveries: [],
		errors: [],
	};

	// Process each audience
	for (const audience of insight.audiences) {
		// Process each channel for this audience
		for (const channelType of audience.channels) {
			const channel = channelRegistry.get(channelType);

			if (!channel) {
				result.errors.push(`Unknown channel type: ${channelType}`);
				continue;
			}

			if (!channel.supportsAudience(audience.audienceType)) {
				result.errors.push(
					`Channel ${channelType} does not support audience ${audience.audienceType}`,
				);
				continue;
			}

			try {
				// Format content for this channel
				const content = await channel.format(insight, audience, formatOptions);

				// Deliver (or preview)
				const deliveryResult = await channel.deliver(content, deliverOptions);

				result.deliveries.push({
					audience,
					channel: channelType,
					result: deliveryResult,
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				result.errors.push(
					`Failed to dispatch to ${channelType} for ${audience.audienceType}: ${errorMessage}`,
				);
			}
		}
	}

	return result;
}

/**
 * Dispatch insights for compliance managers only (tasks + notifications)
 */
export async function dispatchToComplianceManagers(
	insight: AgentInsight,
	formatOptions: FormatOptions,
	preview = false,
): Promise<DispatchResult> {
	// Filter to compliance manager audience
	const complianceManagerAudiences = insight.audiences.filter(
		(a) => a.audienceType === "compliance_manager",
	);

	if (complianceManagerAudiences.length === 0) {
		return {
			insightId: insight.id,
			deliveries: [],
			errors: [],
		};
	}

	// Create modified insight with only compliance manager audiences
	const filteredInsight: AgentInsight = {
		...insight,
		audiences: complianceManagerAudiences,
	};

	return dispatchInsight(filteredInsight, formatOptions, {
		preview,
		organisationId: formatOptions.organisationId,
	});
}

/**
 * Create a task from an insight directly (convenience function)
 */
export async function createTaskFromInsight(
	insight: AgentInsight,
	formatOptions: FormatOptions,
): Promise<ChannelDeliveryResult | null> {
	const taskCh = channelRegistry.get("task");
	if (!taskCh) {
		return null;
	}

	// Find or create compliance manager audience
	let complianceAudience = insight.audiences.find(
		(a) => a.audienceType === "compliance_manager",
	);

	if (!complianceAudience) {
		complianceAudience = {
			audienceType: "compliance_manager",
			channels: ["task"],
		};
	}

	const content = await taskCh.format(insight, complianceAudience, formatOptions);
	return taskCh.deliver(content, {
		preview: false,
		organisationId: formatOptions.organisationId,
	});
}

// ============================================
// Exports
// ============================================

export { taskChannel } from "./task";
export type * from "./types";
