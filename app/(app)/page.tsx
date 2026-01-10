"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
	AreaChart,
	Area,
	ResponsiveContainer,
} from "recharts";
import {
	Users,
	ShieldCheck,
	ClipboardList,
	Zap,
	AlertTriangle,
	ChevronRight,
	ChevronDown,
	Mail,
	FileText,
	Shield,
	Phone,
	Sparkles,
	Clock,
	User,
	ArrowUpRight,
	Check,
	X,
	Bell,
	TrendingUp,
	TrendingDown,
	Minus,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface ActivityItem {
	id: string;
	type: "message" | "document" | "compliance" | "reference" | "verification";
	summary: string;
	timestamp: Date;
	subject?: {
		name: string;
		id: string;
	};
	details?: string;
}

interface DashboardStats {
	activeOnboarding: number;
	complianceRate: number;
	pendingReviews: number;
	actionsToday: number;
	trends: {
		onboarding: "up" | "down" | "stable";
		compliance: "up" | "down" | "stable";
		reviews: "up" | "down" | "stable";
		actions: "up" | "down" | "stable";
	};
}

interface UrgentAlert {
	id: string;
	severity: "critical" | "warning";
	title: string;
	description: string;
	action: {
		label: string;
		href: string;
	};
}

interface TaskPreview {
	id: string;
	title: string;
	priority: "urgent" | "high" | "medium" | "low";
	status: "pending" | "in_progress";
	subject?: {
		name: string;
		id: string;
	};
	dueAt?: Date;
	source: "ai_agent" | "manual" | "system";
}

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_STATS: DashboardStats = {
	activeOnboarding: 23,
	complianceRate: 87,
	pendingReviews: 8,
	actionsToday: 47,
	trends: {
		onboarding: "up",
		compliance: "stable",
		reviews: "down",
		actions: "up",
	},
};

const MOCK_SPARKLINE_DATA = [
	{ value: 12 },
	{ value: 18 },
	{ value: 15 },
	{ value: 22 },
	{ value: 28 },
	{ value: 35 },
	{ value: 32 },
	{ value: 38 },
	{ value: 42 },
	{ value: 47 },
];

const MOCK_ALERTS: UrgentAlert[] = [
	{
		id: "1",
		severity: "critical",
		title: "DBS Certificate Expiring",
		description: "Sarah Thompson's DBS expires in 3 days with no renewal in progress",
		action: { label: "View Candidate", href: "/candidates/1" },
	},
];

const MOCK_TASKS: TaskPreview[] = [
	{
		id: "1",
		title: "Review uploaded Right to Work document",
		priority: "urgent",
		status: "pending",
		subject: { name: "Marcus Johnson", id: "2" },
		dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
		source: "ai_agent",
	},
	{
		id: "2",
		title: "Chase missing reference from St Mary's Hospital",
		priority: "high",
		status: "in_progress",
		subject: { name: "Priya Sharma", id: "3" },
		dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
		source: "ai_agent",
	},
	{
		id: "3",
		title: "Verify training certificate authenticity",
		priority: "high",
		status: "pending",
		subject: { name: "James Chen", id: "4" },
		source: "manual",
	},
	{
		id: "4",
		title: "Follow up on incomplete application",
		priority: "medium",
		status: "pending",
		subject: { name: "Emma Wilson", id: "5" },
		dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
		source: "ai_agent",
	},
	{
		id: "5",
		title: "Review flagged compliance gap",
		priority: "medium",
		status: "pending",
		subject: { name: "David Brown", id: "6" },
		source: "system",
	},
];

const ACTIVITY_POOL: Omit<ActivityItem, "id" | "timestamp">[] = [
	{
		type: "message",
		summary: "Sent document reminder to Sarah Thompson",
		subject: { name: "Sarah Thompson", id: "1" },
		details: "DBS certificate expires in 7 days",
	},
	{
		type: "verification",
		summary: "Verified DBS certificate for Marcus Johnson",
		subject: { name: "Marcus Johnson", id: "2" },
		details: "Certificate valid until 2026",
	},
	{
		type: "reference",
		summary: "Chased reference from St Mary's Hospital",
		subject: { name: "Priya Sharma", id: "3" },
		details: "Second follow-up sent",
	},
	{
		type: "compliance",
		summary: "Flagged expiring training for James Chen",
		subject: { name: "James Chen", id: "4" },
		details: "Manual handling certification expires in 14 days",
	},
	{
		type: "verification",
		summary: "Completed Right to Work check for Emma Wilson",
		subject: { name: "Emma Wilson", id: "5" },
		details: "UK passport verified",
	},
	{
		type: "document",
		summary: "Processed uploaded CV from David Brown",
		subject: { name: "David Brown", id: "6" },
		details: "Document added to profile",
	},
	{
		type: "message",
		summary: "Sent welcome email to new candidate",
		subject: { name: "Sophie Taylor", id: "7" },
		details: "Onboarding portal link sent",
	},
	{
		type: "reference",
		summary: "Received reference from Kings College Hospital",
		subject: { name: "Oliver White", id: "8" },
		details: "2 of 2 references complete",
	},
	{
		type: "compliance",
		summary: "Updated compliance status for Amara Okafor",
		subject: { name: "Amara Okafor", id: "9" },
		details: "Now 100% compliant",
	},
	{
		type: "verification",
		summary: "Initiated DBS check for new starter",
		subject: { name: "Hassan Ali", id: "10" },
		details: "Estimated completion: 5 days",
	},
	{
		type: "message",
		summary: "Sent training reminder to Grace Kelly",
		subject: { name: "Grace Kelly", id: "11" },
		details: "Fire safety training due",
	},
	{
		type: "document",
		summary: "Archived expired certificate for review",
		subject: { name: "Michael Scott", id: "12" },
		details: "Previous POVA certificate",
	},
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getInitials(name: string): string {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

const avatarColors = [
	"bg-blue-500",
	"bg-purple-500",
	"bg-pink-500",
	"bg-green-500",
	"bg-orange-500",
	"bg-teal-500",
];

function getAvatarColor(name: string): string {
	const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return avatarColors[hash % avatarColors.length];
}

function getActivityIcon(type: ActivityItem["type"]) {
	switch (type) {
		case "message":
			return Mail;
		case "document":
			return FileText;
		case "compliance":
			return Shield;
		case "reference":
			return Phone;
		case "verification":
			return ShieldCheck;
		default:
			return Zap;
	}
}

function getActivityColor(type: ActivityItem["type"]) {
	switch (type) {
		case "message":
			return "text-blue-500";
		case "document":
			return "text-purple-500";
		case "compliance":
			return "text-orange-500";
		case "reference":
			return "text-green-500";
		case "verification":
			return "text-teal-500";
		default:
			return "text-gray-500";
	}
}

// =============================================================================
// COMPONENTS
// =============================================================================

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
	const [displayValue, setDisplayValue] = useState(0);

	useEffect(() => {
		let startTime: number;
		let animationFrame: number;
		const startValue = displayValue;

		const animate = (timestamp: number) => {
			if (!startTime) startTime = timestamp;
			const progress = Math.min((timestamp - startTime) / duration, 1);

			setDisplayValue(Math.floor(startValue + (value - startValue) * progress));

			if (progress < 1) {
				animationFrame = requestAnimationFrame(animate);
			}
		};

		animationFrame = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animationFrame);
	}, [value, duration]);

	return <span>{displayValue}</span>;
}

function TrendIndicator({ trend, className }: { trend: "up" | "down" | "stable"; className?: string }) {
	if (trend === "up") {
		return <TrendingUp className={cn("h-4 w-4 text-green-500", className)} />;
	}
	if (trend === "down") {
		return <TrendingDown className={cn("h-4 w-4 text-red-500", className)} />;
	}
	return <Minus className={cn("h-4 w-4 text-muted-foreground", className)} />;
}

function Sparkline({ data, color = "#3b82f6" }: { data: { value: number }[]; color?: string }) {
	return (
		<div className="h-8 w-20">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data}>
					<defs>
						<linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={color} stopOpacity={0.3} />
							<stop offset="100%" stopColor={color} stopOpacity={0} />
						</linearGradient>
					</defs>
					<Area
						type="monotone"
						dataKey="value"
						stroke={color}
						strokeWidth={1.5}
						fill={`url(#gradient-${color})`}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

function StatsCard({
	title,
	value,
	icon: Icon,
	trend,
	sparklineData,
	sparklineColor,
	suffix,
}: {
	title: string;
	value: number;
	icon: React.ComponentType<{ className?: string }>;
	trend: "up" | "down" | "stable";
	sparklineData?: { value: number }[];
	sparklineColor?: string;
	suffix?: string;
}) {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<p className="text-sm text-muted-foreground">{title}</p>
						<div className="flex items-baseline gap-2 mt-1">
							<p className="text-2xl font-bold">
								<AnimatedCounter value={value} />
								{suffix}
							</p>
							<TrendIndicator trend={trend} />
						</div>
					</div>
					<div className="flex flex-col items-end gap-2">
						<Icon className="h-5 w-5 text-muted-foreground" />
						{sparklineData && (
							<Sparkline data={sparklineData} color={sparklineColor} />
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function ComplianceRing({ rate }: { rate: number }) {
	const compliant = rate;
	const expiring = Math.min(100 - rate, 8);
	const gaps = 100 - compliant - expiring;

	return (
		<Card>
			<CardContent className="p-4">
				<div className="flex items-center gap-4">
					<div className="relative h-16 w-16">
						<svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
							{/* Background circle */}
							<circle
								cx="18"
								cy="18"
								r="15.9"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								className="text-muted/20"
							/>
							{/* Gaps (red) */}
							<circle
								cx="18"
								cy="18"
								r="15.9"
								fill="none"
								stroke="#ef4444"
								strokeWidth="2"
								strokeDasharray={`${gaps} ${100 - gaps}`}
								strokeDashoffset={-compliant - expiring}
								className="transition-all duration-1000"
							/>
							{/* Expiring (amber) */}
							<circle
								cx="18"
								cy="18"
								r="15.9"
								fill="none"
								stroke="#f59e0b"
								strokeWidth="2"
								strokeDasharray={`${expiring} ${100 - expiring}`}
								strokeDashoffset={-compliant}
								className="transition-all duration-1000"
							/>
							{/* Compliant (green) */}
							<circle
								cx="18"
								cy="18"
								r="15.9"
								fill="none"
								stroke="#22c55e"
								strokeWidth="2"
								strokeDasharray={`${compliant} ${100 - compliant}`}
								strokeDashoffset="0"
								className="transition-all duration-1000"
							/>
						</svg>
						<div className="absolute inset-0 flex items-center justify-center">
							<span className="text-sm font-bold">{rate}%</span>
						</div>
					</div>
					<div className="flex-1">
						<p className="text-sm text-muted-foreground">Compliance Rate</p>
						<div className="mt-2 space-y-1 text-xs">
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-green-500" />
								<span>{compliant}% Compliant</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-amber-500" />
								<span>{expiring}% Expiring</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-red-500" />
								<span>{gaps}% Gaps</span>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

function UrgentAlertsBanner({ alerts }: { alerts: UrgentAlert[] }) {
	if (alerts.length === 0) return null;

	return (
		<div className="space-y-2">
			{alerts.map((alert) => (
				<motion.div
					key={alert.id}
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className={cn(
						"flex items-center justify-between rounded-lg border p-3",
						alert.severity === "critical"
							? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
							: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
					)}
				>
					<div className="flex items-center gap-3">
						<AlertTriangle
							className={cn(
								"h-5 w-5",
								alert.severity === "critical" ? "text-red-600" : "text-amber-600"
							)}
						/>
						<div>
							<p className="font-medium text-sm">{alert.title}</p>
							<p className="text-xs text-muted-foreground">{alert.description}</p>
						</div>
					</div>
					<Button variant="outline" size="sm" asChild>
						<Link href={alert.action.href}>{alert.action.label}</Link>
					</Button>
				</motion.div>
			))}
		</div>
	);
}

function ActivityFeedItem({ item, isNew }: { item: ActivityItem; isNew?: boolean }) {
	const [isOpen, setIsOpen] = useState(false);
	const Icon = getActivityIcon(item.type);
	const iconColor = getActivityColor(item.type);

	return (
		<motion.div
			initial={isNew ? { opacity: 0, y: -20, height: 0 } : false}
			animate={{ opacity: 1, y: 0, height: "auto" }}
			transition={{ duration: 0.3 }}
		>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<div
					className={cn(
						"flex items-start gap-3 rounded-lg border p-3 transition-colors",
						isNew && "bg-primary/5 border-primary/20"
					)}
				>
					<div className={cn("mt-0.5 rounded-full p-1.5 bg-muted", iconColor)}>
						<Icon className="h-3.5 w-3.5 text-white" />
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-start justify-between gap-2">
							<div className="flex-1">
								<div className="flex items-center gap-2">
									<Badge variant="outline" className="text-[10px] gap-1 px-1.5">
										<Sparkles className="h-2.5 w-2.5" />
										Cred AI
									</Badge>
									<span className="text-xs text-muted-foreground">
										{formatDistanceToNow(item.timestamp, { addSuffix: true })}
									</span>
								</div>
								<p className="text-sm mt-1">{item.summary}</p>
								{item.details && (
									<p className="text-xs text-muted-foreground mt-0.5">
										{item.details}
									</p>
								)}
							</div>
							{item.subject && (
								<CollapsibleTrigger asChild>
									<Button variant="ghost" size="sm" className="h-7 px-2 shrink-0">
										{isOpen ? (
											<ChevronDown className="h-4 w-4" />
										) : (
											<ChevronRight className="h-4 w-4" />
										)}
									</Button>
								</CollapsibleTrigger>
							)}
						</div>
						<CollapsibleContent>
							{item.subject && (
								<div className="mt-2 pt-2 border-t flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Avatar className="h-6 w-6">
											<AvatarFallback
												className={cn(
													getAvatarColor(item.subject.name),
													"text-[10px] text-white"
												)}
											>
												{getInitials(item.subject.name)}
											</AvatarFallback>
										</Avatar>
										<span className="text-sm">{item.subject.name}</span>
									</div>
									<Button variant="outline" size="sm" asChild>
										<Link href={`/candidates/${item.subject.id}`}>
											View Candidate
										</Link>
									</Button>
								</div>
							)}
						</CollapsibleContent>
					</div>
				</div>
			</Collapsible>
		</motion.div>
	);
}

function ActivityFeed({
	activities,
	newActivityIds,
}: {
	activities: ActivityItem[];
	newActivityIds: Set<string>;
}) {
	return (
		<Card className="flex flex-col h-full">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-lg flex items-center gap-2">
							<Zap className="h-5 w-5" />
							Agent Activity
						</CardTitle>
						<CardDescription>Real-time updates from Cred AI</CardDescription>
					</div>
					<div className="flex items-center gap-1">
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
							<span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
						</span>
						<span className="text-xs text-muted-foreground">Live</span>
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex-1 overflow-hidden">
				<div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
					<AnimatePresence mode="popLayout">
						{activities.map((activity) => (
							<ActivityFeedItem
								key={activity.id}
								item={activity}
								isNew={newActivityIds.has(activity.id)}
							/>
						))}
					</AnimatePresence>
				</div>
			</CardContent>
		</Card>
	);
}

const priorityConfig = {
	urgent: {
		label: "Urgent",
		color: "bg-red-500",
		textColor: "text-red-700",
		bgColor: "bg-red-50",
	},
	high: {
		label: "High",
		color: "bg-orange-500",
		textColor: "text-orange-700",
		bgColor: "bg-orange-50",
	},
	medium: {
		label: "Medium",
		color: "bg-yellow-500",
		textColor: "text-yellow-700",
		bgColor: "bg-yellow-50",
	},
	low: {
		label: "Low",
		color: "bg-gray-400",
		textColor: "text-gray-600",
		bgColor: "bg-gray-50",
	},
};

const statusConfig = {
	pending: { label: "Pending", icon: Clock, color: "text-yellow-600" },
	in_progress: { label: "In Progress", icon: ArrowUpRight, color: "text-blue-600" },
	completed: { label: "Completed", icon: Check, color: "text-green-600" },
	dismissed: { label: "Dismissed", icon: X, color: "text-gray-500" },
	snoozed: { label: "Snoozed", icon: Bell, color: "text-purple-600" },
};

function TaskPreviewCard({ task }: { task: TaskPreview }) {
	const StatusIcon = statusConfig[task.status].icon;

	return (
		<div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
			<div
				className={cn(
					"w-1 h-10 rounded-full shrink-0",
					priorityConfig[task.priority].color
				)}
			/>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<Badge
						className={cn(
							"text-[10px]",
							priorityConfig[task.priority].bgColor,
							priorityConfig[task.priority].textColor,
							"border-0"
						)}
					>
						{priorityConfig[task.priority].label}
					</Badge>
					{task.source === "ai_agent" && (
						<Badge variant="outline" className="text-[10px] gap-0.5 px-1">
							<Sparkles className="h-2.5 w-2.5" />
							AI
						</Badge>
					)}
					<StatusIcon
						className={cn("h-3.5 w-3.5", statusConfig[task.status].color)}
					/>
				</div>
				<p className="text-sm line-clamp-1">{task.title}</p>
				{task.subject && (
					<div className="flex items-center gap-1.5 mt-1">
						<Avatar className="h-4 w-4">
							<AvatarFallback
								className={cn(
									getAvatarColor(task.subject.name),
									"text-[8px] text-white"
								)}
							>
								{getInitials(task.subject.name)}
							</AvatarFallback>
						</Avatar>
						<span className="text-xs text-muted-foreground truncate">
							{task.subject.name}
						</span>
					</div>
				)}
			</div>
			<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
				<Link href={`/tasks`}>
					<ChevronRight className="h-4 w-4" />
				</Link>
			</Button>
		</div>
	);
}

function TasksPreview({ tasks }: { tasks: TaskPreview[] }) {
	return (
		<Card className="flex flex-col h-full">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-lg flex items-center gap-2">
							<ClipboardList className="h-5 w-5" />
							Needs Attention
						</CardTitle>
						<CardDescription>Tasks requiring your input</CardDescription>
					</div>
					<Button variant="outline" size="sm" asChild>
						<Link href="/tasks">View All</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent className="flex-1 overflow-hidden">
				<div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
					{tasks.map((task) => (
						<TaskPreviewCard key={task.id} task={task} />
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function PipelineFunnel() {
	const stages = [
		{ label: "Applied", count: 23, color: "bg-blue-500" },
		{ label: "Documents", count: 15, color: "bg-purple-500" },
		{ label: "Verification", count: 8, color: "bg-orange-500" },
		{ label: "Ready", count: 4, color: "bg-green-500" },
	];

	const maxCount = Math.max(...stages.map((s) => s.count));

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">Onboarding Pipeline</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{stages.map((stage, index) => (
						<div key={stage.label} className="flex items-center gap-3">
							<div className="w-24 text-xs text-muted-foreground">
								{stage.label}
							</div>
							<div className="flex-1">
								<div className="h-6 bg-muted rounded-full overflow-hidden">
									<motion.div
										initial={{ width: 0 }}
										animate={{ width: `${(stage.count / maxCount) * 100}%` }}
										transition={{ duration: 0.8, delay: index * 0.1 }}
										className={cn("h-full rounded-full", stage.color)}
									/>
								</div>
							</div>
							<div className="w-8 text-sm font-medium text-right">
								{stage.count}
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function HomePage() {
	const [activities, setActivities] = useState<ActivityItem[]>([]);
	const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
	const [stats, setStats] = useState(MOCK_STATS);
	const [activityIndex, setActivityIndex] = useState(0);

	// Generate initial activities
	useEffect(() => {
		const initialActivities: ActivityItem[] = ACTIVITY_POOL.slice(0, 5).map(
			(item, idx) => ({
				...item,
				id: `initial-${idx}`,
				timestamp: new Date(Date.now() - idx * 5 * 60 * 1000),
			})
		);
		setActivities(initialActivities);
	}, []);

	// Live activity ticker - adds new activities periodically
	const addNewActivity = useCallback(() => {
		const poolItem = ACTIVITY_POOL[activityIndex % ACTIVITY_POOL.length];
		const newActivity: ActivityItem = {
			...poolItem,
			id: `live-${Date.now()}`,
			timestamp: new Date(),
		};

		setActivities((prev) => [newActivity, ...prev.slice(0, 9)]);
		setNewActivityIds((prev) => new Set([...prev, newActivity.id]));
		setActivityIndex((prev) => prev + 1);

		// Update stats
		setStats((prev) => ({
			...prev,
			actionsToday: prev.actionsToday + 1,
		}));

		// Clear "new" status after animation
		setTimeout(() => {
			setNewActivityIds((prev) => {
				const next = new Set(prev);
				next.delete(newActivity.id);
				return next;
			});
		}, 2000);
	}, [activityIndex]);

	useEffect(() => {
		// Random interval between 4-8 seconds
		const getRandomInterval = () => 4000 + Math.random() * 4000;

		let timeoutId: ReturnType<typeof setTimeout>;

		const scheduleNext = () => {
			timeoutId = setTimeout(() => {
				addNewActivity();
				scheduleNext();
			}, getRandomInterval());
		};

		// Start after initial delay
		const initialTimeout = setTimeout(() => {
			scheduleNext();
		}, 3000);

		return () => {
			clearTimeout(initialTimeout);
			clearTimeout(timeoutId);
		};
	}, [addNewActivity]);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-semibold">Dashboard</h1>
				<p className="text-muted-foreground">
					Your AI team at work — here's what's happening
				</p>
			</div>

			{/* Urgent Alerts */}
			<UrgentAlertsBanner alerts={MOCK_ALERTS} />

			{/* Stats Bar */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatsCard
					title="Active Onboarding"
					value={stats.activeOnboarding}
					icon={Users}
					trend={stats.trends.onboarding}
				/>
				<ComplianceRing rate={stats.complianceRate} />
				<StatsCard
					title="Pending Reviews"
					value={stats.pendingReviews}
					icon={ClipboardList}
					trend={stats.trends.reviews}
				/>
				<StatsCard
					title="Actions Today"
					value={stats.actionsToday}
					icon={Zap}
					trend={stats.trends.actions}
					sparklineData={MOCK_SPARKLINE_DATA}
					sparklineColor="#3b82f6"
				/>
			</div>

			{/* Pipeline */}
			<PipelineFunnel />

			{/* Main Content: Activity Feed + Tasks */}
			<div className="grid gap-6 lg:grid-cols-2">
				<ActivityFeed activities={activities} newActivityIds={newActivityIds} />
				<TasksPreview tasks={MOCK_TASKS} />
			</div>
		</div>
	);
}
