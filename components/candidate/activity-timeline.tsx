"use client";

import { useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Bot, User, Users, Cog, Link2, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Activity } from "@/lib/db/schema";

// =============================================================================
// TYPES
// =============================================================================

export interface TimelineData {
	activities: Activity[];
	startDate: Date;
	endDate: Date;
}

interface PositionedActivity {
	activity: Activity;
	xPercent: number; // 0-100 position on timeline
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ACTOR_CONFIG = {
	ai: {
		bg: "bg-purple-500",
		text: "text-purple-500",
		bgLight: "bg-purple-100",
		label: "AI",
		Icon: Bot,
	},
	admin: {
		bg: "bg-blue-500",
		text: "text-blue-500",
		bgLight: "bg-blue-100",
		label: "Admin",
		Icon: Users,
	},
	candidate: {
		bg: "bg-green-500",
		text: "text-green-500",
		bgLight: "bg-green-100",
		label: "Candidate",
		Icon: User,
	},
	system: {
		bg: "bg-gray-400",
		text: "text-gray-400",
		bgLight: "bg-gray-100",
		label: "System",
		Icon: Cog,
	},
	integration: {
		bg: "bg-gray-400",
		text: "text-gray-400",
		bgLight: "bg-gray-100",
		label: "Integration",
		Icon: Link2,
	},
} as const;

type Actor = keyof typeof ACTOR_CONFIG;

const DOT_SIZE = 12; // pixels

// =============================================================================
// HELPERS
// =============================================================================

function calculatePositions(
	activities: Activity[],
	startDate: Date,
	endDate: Date
): PositionedActivity[] {
	const timeRange = endDate.getTime() - startDate.getTime();
	if (timeRange <= 0) return [];

	return activities.map((activity) => ({
		activity,
		xPercent: ((activity.createdAt.getTime() - startDate.getTime()) / timeRange) * 100,
	}));
}

function generateDayTicks(startDate: Date, endDate: Date): Date[] {
	const ticks: Date[] = [];
	const current = new Date(startDate);
	current.setHours(0, 0, 0, 0);

	while (current <= endDate) {
		ticks.push(new Date(current));
		current.setDate(current.getDate() + 1);
	}

	return ticks;
}

function formatTickLabel(date: Date, endDate: Date): string {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const tickDay = new Date(date);
	tickDay.setHours(0, 0, 0, 0);

	if (tickDay.getTime() === today.getTime()) return "Today";

	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);
	if (tickDay.getTime() === yesterday.getTime()) return "Yesterday";

	return format(date, "d MMM");
}

// =============================================================================
// ACTIVITY DOT
// =============================================================================

function ActivityDot({ positioned }: { positioned: PositionedActivity }) {
	const { activity } = positioned;
	const config = ACTOR_CONFIG[activity.actor as Actor] || ACTOR_CONFIG.system;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<motion.div
					className={cn(
						"absolute rounded-full cursor-help ring-2 ring-white",
						config.bg
					)}
					style={{
						width: DOT_SIZE,
						height: DOT_SIZE,
					}}
					initial={false}
					whileHover={{ scale: 1.8 }}
					transition={{ type: "spring", stiffness: 400, damping: 25 }}
				/>
			</TooltipTrigger>
			<TooltipContent side="top" sideOffset={8}>
				<div className="max-w-[250px]">
					<p className="font-medium text-sm">{activity.summary}</p>
					<div className="flex items-center gap-2 mt-1">
						<Badge
							variant="secondary"
							className={cn("text-[10px] px-1.5 py-0", config.bgLight, config.text)}
						>
							{config.label}
						</Badge>
						<span className="text-[10px] text-muted-foreground">
							{format(activity.createdAt, "d MMM, HH:mm")}
						</span>
					</div>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface ActivityTimelineProps {
	data: TimelineData;
	profileId: string;
}

export function ActivityTimeline({ data, profileId }: ActivityTimelineProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const { activities, startDate, endDate } = data;

	// Scroll to right (most recent) on mount
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
		}
	}, []);

	// Calculate positions for all activities
	const positionedActivities = useMemo(
		() => calculatePositions(activities, startDate, endDate),
		[activities, startDate, endDate]
	);

	// Generate day ticks
	const dayTicks = useMemo(
		() => generateDayTicks(startDate, endDate),
		[startDate, endDate]
	);

	// Calculate tick positions
	const timeRange = endDate.getTime() - startDate.getTime();
	const tickPositions = dayTicks.map((tick) => ({
		date: tick,
		xPercent: ((tick.getTime() - startDate.getTime()) / timeRange) * 100,
	}));

	return (
		<TooltipProvider delayDuration={0} disableHoverableContent>
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center justify-between mb-3">
						<div>
							<h3 className="text-sm font-medium">Activity Timeline</h3>
							<p className="text-xs text-muted-foreground">
								{activities.length} activit{activities.length === 1 ? "y" : "ies"} in the last 7 days
							</p>
						</div>
						<a
							href={`/candidates/${profileId}/timeline`}
							className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
						>
							View all <ChevronRight className="h-3 w-3" />
						</a>
					</div>

					{/* Scrollable timeline wrapper */}
					<div className="relative">
						{/* Fade gradients */}
						<div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10" />
						<div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10" />

						{/* Scrollable container */}
						<div ref={scrollRef} className="overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
							{/* Wide timeline content */}
							<div className="relative px-6" style={{ width: "150%", minWidth: "600px" }}>
								{/* Main timeline line */}
								<div className="absolute left-6 right-6 top-[12px] h-px bg-border" />

								{/* Day tick marks - small ticks down from line */}
								{tickPositions.map(({ date, xPercent }) => (
									<div
										key={date.toISOString()}
										className="absolute w-px h-2 bg-border/50"
										style={{ left: `calc(${xPercent}% + 24px - ${xPercent * 48 / 100}px)`, top: 12 }}
									/>
								))}

								{/* Activity dots - all on the line */}
								<div className="relative h-8">
									{positionedActivities.map((positioned) => (
										<div
											key={positioned.activity.id}
											className="absolute"
											style={{
												left: `${positioned.xPercent}%`,
												transform: "translateX(-50%)",
												top: 12 - DOT_SIZE / 2,
											}}
										>
											<ActivityDot positioned={positioned} />
										</div>
									))}
								</div>

								{/* Day labels */}
								<div className="relative h-5">
									{tickPositions
										.filter((_, i) => i % 2 === 0 || i === tickPositions.length - 1)
										.map(({ date, xPercent }) => (
											<span
												key={date.toISOString()}
												className="absolute text-[10px] text-muted-foreground transform -translate-x-1/2"
												style={{ left: `${xPercent}%` }}
											>
												{formatTickLabel(date, endDate)}
											</span>
										))}
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</TooltipProvider>
	);
}
