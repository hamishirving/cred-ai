"use client";

import { cn } from "@/lib/utils";
import type { VoiceCallStatus, VoiceCallOutcome } from "@/lib/voice/types";
import {
	Phone,
	PhoneCall,
	PhoneOff,
	PhoneIncoming,
	Clock,
	XCircle,
	CheckCircle2,
	Voicemail,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CallStatusBadgeProps {
	status: string;
	outcome?: VoiceCallOutcome | null;
	showIcon?: boolean;
	className?: string;
}

const statusConfig: Record<
	VoiceCallStatus,
	{
		label: string;
		variant: "neutral" | "info" | "warning" | "success" | "danger";
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	pending: {
		label: "Pending",
		variant: "neutral",
		icon: Clock,
	},
	queued: {
		label: "Queued",
		variant: "info",
		icon: Clock,
	},
	ringing: {
		label: "Ringing",
		variant: "warning",
		icon: PhoneIncoming,
	},
	"in-progress": {
		label: "In Progress",
		variant: "success",
		icon: PhoneCall,
	},
	ended: {
		label: "Ended",
		variant: "neutral",
		icon: Phone,
	},
	failed: {
		label: "Failed",
		variant: "danger",
		icon: XCircle,
	},
};

const outcomeConfig: Record<
	VoiceCallOutcome,
	{
		label: string;
		variant: "success" | "warning" | "danger" | "info";
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	completed: {
		label: "Completed",
		variant: "success",
		icon: CheckCircle2,
	},
	no_answer: {
		label: "No Answer",
		variant: "warning",
		icon: PhoneOff,
	},
	busy: {
		label: "Busy",
		variant: "warning",
		icon: PhoneOff,
	},
	failed: {
		label: "Failed",
		variant: "danger",
		icon: XCircle,
	},
	voicemail: {
		label: "Voicemail",
		variant: "info",
		icon: Voicemail,
	},
};

export function CallStatusBadge({
	status,
	outcome,
	showIcon = true,
	className,
}: CallStatusBadgeProps) {
	// Use outcome config if call ended with an outcome, otherwise use status
	const normalizedStatus = status as VoiceCallStatus;
	const config =
		status === "ended" && outcome
			? outcomeConfig[outcome]
			: statusConfig[normalizedStatus] || statusConfig.pending;

	const Icon = config.icon;

	return (
		<Badge
			variant={config.variant}
			className={cn(
				"gap-1.5",
				status === "ringing" && "animate-pulse",
				className,
			)}
		>
			{showIcon && <Icon className="h-3 w-3" />}
			{config.label}
		</Badge>
	);
}
