export interface AgentMetricsResponse {
	window: { from: string; to: string; label: string };
	runs: {
		total: number;
		byStatus: {
			running: number;
			completed: number;
			failed: number;
			escalated: number;
		};
		successRate: number;
		byTriggerType: { manual: number; schedule: number; event: number };
		durationMs: { avg: number; p50: number; p95: number };
	};
	tools: {
		totalCalls: number;
		avgCallsPerRun: number;
		topTools: Array<{ toolName: string; count: number }>;
		automationActionRuns: number;
		automationActionRate: number;
		smsToEmailFallbackRate: number;
	};
	communications: {
		emailDrafted: number;
		smsSent: number;
		smsFailed: number;
	};
	tasks: {
		aiCreated: number;
		aiCompleted: number;
		completionRate: number;
		openCount: number;
		avgOpenDays: number | null;
	};
	valueEstimate: {
		completedRuns: number;
		hoursSaved: number;
		hourlyRate: number;
		currencySymbol: "£" | "$";
		moneySaved: number;
		model: "heuristic_v1";
	};
}

export type AgentMetricsRange = "7d" | "30d" | "90d";
