import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Types from API
export interface PlacementRow {
	id: string;
	candidateName: string;
	candidateEmail: string;
	roleName: string;
	facilityName: string;
	jurisdiction: string | null;
	startDate: string | null;
	status: string;
	compliancePercentage: number;
	isCompliant: boolean;
	dealType: string | null;
}

// Status tabs for the table view filter
export const STATUS_TABS = [
	{ value: null as string | null, label: "All" },
	{ value: "onboarding", label: "Onboarding" },
	{ value: "compliance", label: "Compliance" },
	{ value: "ready", label: "Ready" },
	{ value: "active", label: "Active" },
	{ value: "completed", label: "Completed" },
];

// Kanban column order (workflow stages, excludes pending/cancelled)
export const KANBAN_STATUSES = [
	"onboarding",
	"compliance",
	"ready",
	"active",
	"completed",
] as const;

export const STATUS_LABELS: Record<string, string> = {
	onboarding: "Onboarding",
	compliance: "Compliance",
	ready: "Ready",
	active: "Active",
	completed: "Completed",
};

// Valid statuses for API validation
export const VALID_STATUSES = [
	"pending",
	"onboarding",
	"compliance",
	"ready",
	"active",
	"completed",
	"cancelled",
] as const;

export const STATUS_BADGE_VARIANT: Record<string, "neutral" | "info" | "warning" | "success" | "danger"> = {
	pending: "neutral",
	onboarding: "info",
	compliance: "warning",
	ready: "success",
	active: "success",
	completed: "neutral",
	cancelled: "danger",
};

// Status dot colours for kanban column headers
export const STATUS_DOT_COLOR: Record<string, string> = {
	onboarding: "bg-[var(--info)]",
	compliance: "bg-[var(--warning)]",
	ready: "bg-[var(--positive)]",
	active: "bg-[var(--positive)]",
	completed: "bg-muted-foreground",
};

// Avatar colours matching candidates page
export const avatarColors = [
	"bg-primary",
	"bg-chart-2",
	"bg-chart-3",
	"bg-destructive",
	"bg-muted-foreground",
	"bg-chart-5",
];

export function getAvatarColor(name: string): string {
	const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return avatarColors[hash % avatarColors.length];
}

export function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}
