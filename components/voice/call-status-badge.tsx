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
		className: string;
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	pending: {
		label: "Pending",
		className: "bg-gray-100 text-gray-700 border-gray-200",
		icon: Clock,
	},
	queued: {
		label: "Queued",
		className: "bg-blue-50 text-blue-700 border-blue-200",
		icon: Clock,
	},
	ringing: {
		label: "Ringing",
		className: "bg-yellow-50 text-yellow-700 border-yellow-200 animate-pulse",
		icon: PhoneIncoming,
	},
	"in-progress": {
		label: "In Progress",
		className: "bg-green-50 text-green-700 border-green-200",
		icon: PhoneCall,
	},
	ended: {
		label: "Ended",
		className: "bg-gray-100 text-gray-700 border-gray-200",
		icon: Phone,
	},
	failed: {
		label: "Failed",
		className: "bg-red-50 text-red-700 border-red-200",
		icon: XCircle,
	},
};

const outcomeConfig: Record<
	VoiceCallOutcome,
	{
		label: string;
		className: string;
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	completed: {
		label: "Completed",
		className: "bg-green-50 text-green-700 border-green-200",
		icon: CheckCircle2,
	},
	no_answer: {
		label: "No Answer",
		className: "bg-yellow-50 text-yellow-700 border-yellow-200",
		icon: PhoneOff,
	},
	busy: {
		label: "Busy",
		className: "bg-orange-50 text-orange-700 border-orange-200",
		icon: PhoneOff,
	},
	failed: {
		label: "Failed",
		className: "bg-red-50 text-red-700 border-red-200",
		icon: XCircle,
	},
	voicemail: {
		label: "Voicemail",
		className: "bg-purple-50 text-purple-700 border-purple-200",
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
		<span
			className={cn(
				"inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
				config.className,
				className,
			)}
		>
			{showIcon && <Icon className="h-3 w-3" />}
			{config.label}
		</span>
	);
}
