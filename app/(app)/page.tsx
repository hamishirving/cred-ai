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
	Mail,
	FileText,
	Shield,
	Phone,
	Sparkles,
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
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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
	"bg-primary",
	"bg-chart-2",
	"bg-chart-3",
	"bg-destructive",
	"bg-muted-foreground",
	"bg-chart-5",
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
			return {
				bg: "bg-primary",
			};
		case "document":
			return {
				bg: "bg-chart-5",
			};
		case "compliance":
			return {
				bg: "bg-chart-3",
			};
		case "reference":
			return {
				bg: "bg-chart-2",
			};
		case "verification":
			return {
				bg: "bg-chart-5",
			};
		default:
			return {
				bg: "bg-muted-foreground",
			};
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
		return <TrendingUp className={cn("h-4 w-4 text-[var(--positive)]", className)} />;
	}
	if (trend === "down") {
		return <TrendingDown className={cn("h-4 w-4 text-destructive", className)} />;
	}
	return <Minus className={cn("h-4 w-4 text-muted-foreground", className)} />;
}

function Sparkline({ data, color = "var(--primary)" }: { data: { value: number }[]; color?: string }) {
	const gradientId = "sparkline-gradient";

	return (
		<div className="h-8 w-20">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data}>
					<defs>
						<linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={color} stopOpacity={0.3} />
							<stop offset="100%" stopColor={color} stopOpacity={0} />
						</linearGradient>
					</defs>
					<Area
						type="monotone"
						dataKey="value"
						stroke={color}
						strokeWidth={1.5}
						fill={`url(#${gradientId})`}
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
		<Card className="shadow-none! bg-card">
			<CardContent className="p-4">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<p className="text-sm text-muted-foreground">{title}</p>
						<div className="flex items-baseline gap-2 mt-1">
							<p className="text-2xl font-semibold text-foreground">
								<AnimatedCounter value={value} />
								{suffix}
							</p>
							<TrendIndicator trend={trend} />
						</div>
					</div>
					<div className="flex flex-col items-end gap-2">
						<Icon className="h-5 w-5 text-muted-foreground/80" />
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
		<Card className="shadow-none! bg-card">
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
								stroke="var(--destructive)"
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
								stroke="var(--warning)"
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
								stroke="var(--positive)"
								strokeWidth="2"
								strokeDasharray={`${compliant} ${100 - compliant}`}
								strokeDashoffset="0"
								className="transition-all duration-1000"
							/>
						</svg>
						<div className="absolute inset-0 flex items-center justify-center">
							<span className="text-sm font-semibold text-foreground">{rate}%</span>
						</div>
					</div>
					<div className="flex-1">
						<p className="text-sm text-muted-foreground">Compliance Rate</p>
						<div className="mt-2 space-y-1 text-xs">
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-[var(--positive)]" />
								<span>{compliant}% Compliant</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-[var(--warning)]" />
								<span>{expiring}% Expiring</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="h-2 w-2 rounded-full bg-destructive" />
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
							? "border-destructive/30 bg-destructive/10"
							: "border-[var(--warning)]/30 bg-[color-mix(in_srgb,var(--warning)_16%,transparent)]"
					)}
				>
					<div className="flex items-center gap-3">
						<AlertTriangle
							className={cn(
								"h-5 w-5",
								alert.severity === "critical" ? "text-destructive" : "text-[var(--warning)]"
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

function ActivityFeed({
	activities,
	newActivityIds,
}: {
	activities: ActivityItem[];
	newActivityIds: Set<string>;
}) {
	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center justify-between mb-2 px-1">
				<h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
					<Zap className="h-4 w-4 text-muted-foreground" />
					Agent Activity
				</h2>
				<div className="flex items-center gap-1">
					<span className="relative flex h-2 w-2">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--positive)] opacity-75"></span>
						<span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--positive)]"></span>
					</span>
					<span className="text-xs text-muted-foreground">Live</span>
				</div>
			</div>
			<Card className="shadow-none! bg-card">
				<Table>
					<TableHeader>
						<TableRow className="bg-[var(--table-head-surface)] hover:bg-[var(--hover-surface)]">
							<TableHead className="text-xs font-medium text-muted-foreground">Activity</TableHead>
							<TableHead className="w-[140px] text-xs font-medium text-muted-foreground">Subject</TableHead>
							<TableHead className="w-[100px] text-xs font-medium text-muted-foreground">Time</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<AnimatePresence mode="popLayout">
							{activities.map((activity) => {
								const Icon = getActivityIcon(activity.type);
								const colors = getActivityColor(activity.type);
								const isNew = newActivityIds.has(activity.id);

								return (
									<motion.tr
										key={activity.id}
										initial={isNew ? { opacity: 0, y: -20 } : false}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.3 }}
										className={cn(
											"border-b border-border bg-card hover:bg-muted last:border-b-0",
											isNew && "bg-primary/10"
										)}
									>
										<TableCell className="py-2">
											<div className="flex items-center gap-2">
												<div className={cn("rounded-full p-1.5 shrink-0", colors.bg)}>
													<Icon className="h-3 w-3 text-white" />
												</div>
												<div className="min-w-0">
													<div className="flex items-center gap-1.5">
														<span className="text-sm font-medium truncate">{activity.summary}</span>
														<Sparkles className="h-3 w-3 shrink-0 text-primary/60" />
													</div>
													{activity.details && (
														<p className="text-xs text-muted-foreground truncate">{activity.details}</p>
													)}
												</div>
											</div>
										</TableCell>
										<TableCell className="py-2">
											{activity.subject ? (
												<Link
													href={`/candidates/${activity.subject.id}`}
													className="flex items-center gap-1.5 hover:underline"
												>
													<Avatar className="h-5 w-5">
														<AvatarFallback
															className={cn(
																getAvatarColor(activity.subject.name),
																"text-[8px] text-white"
															)}
														>
															{getInitials(activity.subject.name)}
														</AvatarFallback>
													</Avatar>
													<span className="text-sm truncate">{activity.subject.name}</span>
												</Link>
											) : (
												<span className="text-sm text-muted-foreground">—</span>
											)}
										</TableCell>
										<TableCell className="py-2">
											<span className="whitespace-nowrap text-xs text-muted-foreground">
												{formatDistanceToNow(activity.timestamp, { addSuffix: true })}
											</span>
										</TableCell>
									</motion.tr>
								);
							})}
						</AnimatePresence>
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

const priorityConfig = {
	urgent: {
		label: "Urgent",
		color: "bg-destructive",
	},
	high: {
		label: "High",
		color: "bg-chart-3",
	},
	medium: {
		label: "Medium",
		color: "bg-chart-3/70",
	},
	low: {
		label: "Low",
		color: "bg-muted-foreground/70",
	},
};

function TasksPreview({ tasks }: { tasks: TaskPreview[] }) {
	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center justify-between mb-2 px-1">
				<h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
					<ClipboardList className="h-4 w-4 text-muted-foreground" />
					Needs Attention
				</h2>
				<Button variant="outline" size="sm" asChild>
					<Link href="/tasks">View All</Link>
				</Button>
			</div>
			<Card className="shadow-none! bg-card">
				<Table>
					<TableHeader>
						<TableRow className="bg-[var(--table-head-surface)] hover:bg-[var(--hover-surface)]">
							<TableHead className="text-xs font-medium text-muted-foreground">Task</TableHead>
							<TableHead className="w-[140px] text-xs font-medium text-muted-foreground">Subject</TableHead>
							<TableHead className="w-[90px] text-xs font-medium text-muted-foreground">Priority</TableHead>
							<TableHead className="w-[40px] text-xs font-medium text-muted-foreground"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{tasks.map((task) => (
							<TableRow
								key={task.id}
								className="cursor-pointer bg-card hover:bg-muted"
								onClick={() => window.location.href = "/tasks"}
							>
								<TableCell className="py-2">
									<div className="flex items-center gap-2">
										<div
											className={cn(
												"w-1 h-8 rounded-full shrink-0",
												priorityConfig[task.priority].color
											)}
										/>
										<div className="min-w-0">
											<div className="flex items-center gap-1.5">
												<span className="text-sm font-medium truncate">{task.title}</span>
												{task.source === "ai_agent" && (
													<Sparkles className="h-3 w-3 shrink-0 text-primary/60" />
												)}
											</div>
										</div>
									</div>
								</TableCell>
								<TableCell className="py-2">
									{task.subject ? (
										<div className="flex items-center gap-1.5">
											<Avatar className="h-5 w-5">
												<AvatarFallback
													className={cn(
														getAvatarColor(task.subject.name),
														"text-[8px] text-white"
													)}
												>
													{getInitials(task.subject.name)}
												</AvatarFallback>
											</Avatar>
											<span className="text-sm truncate">{task.subject.name}</span>
										</div>
									) : (
										<span className="text-sm text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell className="py-2">
									<Badge
										variant={
											task.priority === "urgent"
												? "danger"
												: task.priority === "low"
													? "neutral"
													: "warning"
										}
										className="text-xs font-medium"
									>
										{priorityConfig[task.priority].label}
									</Badge>
								</TableCell>
								<TableCell className="py-2">
									<ChevronRight className="h-4 w-4 text-muted-foreground/80" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>
		</div>
	);
}

function PipelineFunnel() {
	const stages = [
		{ label: "Applied", count: 23, color: "bg-primary" },
		{ label: "Documents", count: 15, color: "bg-chart-5" },
		{ label: "Verification", count: 8, color: "bg-chart-3" },
		{ label: "Ready", count: 4, color: "bg-chart-2" },
	];

	const maxCount = Math.max(...stages.map((s) => s.count));

	return (
		<Card className="shadow-none! bg-card">
			<CardHeader className="pb-2">
				<CardTitle className="text-base font-semibold tracking-tight text-foreground">Onboarding Pipeline</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{stages.map((stage, index) => (
						<div key={stage.label} className="flex items-center gap-3">
							<div className="w-24 text-xs text-muted-foreground">
								{stage.label}
							</div>
							<div className="flex-1">
								<div className="h-6 overflow-hidden rounded-full bg-muted">
									<motion.div
										initial={{ width: 0 }}
										animate={{ width: `${(stage.count / maxCount) * 100}%` }}
										transition={{ duration: 0.8, delay: index * 0.1 }}
										className={cn("h-full rounded-full", stage.color)}
									/>
								</div>
							</div>
							<div className="w-8 text-right text-sm font-semibold text-foreground">
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
		<div className="flex min-h-full flex-1 flex-col gap-10 bg-background p-8">
			{/* Header */}
			<div>
				<h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">Dashboard</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Your AI team at work — here's what's happening
				</p>
			</div>

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
					sparklineColor="var(--primary)"
				/>
			</div>

			{/* Main Content: Activity Feed + Tasks */}
			<div className="grid gap-6 lg:grid-cols-2">
				<ActivityFeed activities={activities} newActivityIds={newActivityIds} />
				<TasksPreview tasks={MOCK_TASKS} />
			</div>
		</div>
	);
}
