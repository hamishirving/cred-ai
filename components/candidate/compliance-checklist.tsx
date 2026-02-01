"use client";

import { useState } from "react";
import {
	ChevronDown,
	ChevronUp,
	Clock,
	AlertCircle,
	CheckCircle2,
	ExternalLink,
	FileText,
	MessageSquare,
	MoreHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ComplianceItemContext, BlockedBy } from "@/lib/ai/agents/types";

/**
 * Extended compliance item with additional display data
 */
interface ComplianceItemDisplay extends ComplianceItemContext {
	/** When evidence was uploaded (if any) */
	uploadedAt?: Date;
	/** When external request was sent (if third party) */
	requestedAt?: Date;
	/** Days since item became blocked */
	daysWaiting?: number;
}

interface ComplianceChecklistProps {
	items: ComplianceItemDisplay[];
	/** Placement context for header */
	placement?: {
		id: string;
		roleName?: string;
		workNodeName: string;
		startDate?: Date;
	};
	/** Callbacks for actions */
	onChaseCandidate?: (itemId: string) => void;
	onReviewItem?: (itemId: string) => void;
	onChaseThirdParty?: (itemId: string) => void;
	onViewEvidence?: (itemId: string) => void;
	/** Show placement context header */
	showPlacementHeader?: boolean;
	/** Default expanded sections */
	defaultExpanded?: BlockedBy[];
}

interface GroupConfig {
	key: BlockedBy;
	label: string;
	icon: React.ReactNode;
	color: string;
	borderColor: string;
	badgeClass: string;
	dotColor: string;
	emptyMessage: string;
}

const GROUP_CONFIG: GroupConfig[] = [
	{
		key: "candidate",
		label: "Candidate action needed",
		icon: <AlertCircle className="h-4 w-4" />,
		color: "text-[#c49332]",
		borderColor: "border-[#c49332]/20",
		badgeClass: "bg-[#faf5eb] text-[#a87c2a] border-0",
		dotColor: "bg-[#c49332]",
		emptyMessage: "No items waiting on candidate",
	},
	{
		key: "admin",
		label: "Internal review",
		icon: <FileText className="h-4 w-4" />,
		color: "text-[#4444cf]",
		borderColor: "border-[#4444cf]/20",
		badgeClass: "bg-[#eeedf8] text-[#4444cf] border-0",
		dotColor: "bg-[#4444cf]",
		emptyMessage: "No items under review",
	},
	{
		key: "third_party",
		label: "Third party",
		icon: <ExternalLink className="h-4 w-4" />,
		color: "text-[#3636b8]",
		borderColor: "border-[#3636b8]/20",
		badgeClass: "bg-[#eeedf8] text-[#3636b8] border-0",
		dotColor: "bg-[#3636b8]",
		emptyMessage: "No items with external providers",
	},
	{
		key: "complete",
		label: "Complete",
		icon: <CheckCircle2 className="h-4 w-4" />,
		color: "text-[#3a9960]",
		borderColor: "border-[#3a9960]/20",
		badgeClass: "bg-[#edf7f1] text-[#3a9960] border-0",
		dotColor: "bg-[#3a9960]",
		emptyMessage: "No completed items",
	},
];

/**
 * Format relative time for display
 */
function formatDaysAgo(days: number | undefined): string {
	if (days === undefined || days === null) return "";
	if (days === 0) return "Today";
	if (days === 1) return "1 day";
	return `${days} days`;
}

/**
 * Format date for display
 */
function formatDate(date: Date | undefined): string {
	if (!date) return "";
	return new Date(date).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
	});
}

/**
 * Calculate days until a date
 */
function daysUntil(date: Date | undefined): number | null {
	if (!date) return null;
	const now = new Date();
	const target = new Date(date);
	return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Compliance checklist component for compliance managers.
 * Groups items by blocker status with actionable UI.
 */
export function ComplianceChecklist({
	items,
	placement,
	onChaseCandidate,
	onReviewItem,
	onChaseThirdParty,
	onViewEvidence,
	showPlacementHeader = false,
	defaultExpanded = ["candidate", "admin", "third_party"],
}: ComplianceChecklistProps) {
	const [expandedGroups, setExpandedGroups] = useState<Set<BlockedBy>>(
		new Set(defaultExpanded)
	);

	// Group items by blocker
	const groupedItems = GROUP_CONFIG.reduce(
		(acc, config) => {
			acc[config.key] = items.filter((item) => item.blockedBy === config.key);
			return acc;
		},
		{} as Record<BlockedBy, ComplianceItemDisplay[]>
	);

	const toggleGroup = (key: BlockedBy) => {
		setExpandedGroups((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	};

	// Calculate stats
	const totalItems = items.length;
	const completeItems = groupedItems.complete?.length || 0;
	const percentage = totalItems > 0 ? Math.round((completeItems / totalItems) * 100) : 0;

	// Days until start
	const daysToStart = placement?.startDate ? daysUntil(placement.startDate) : null;

	return (
		<div className="space-y-3">
			{/* Placement header */}
			{showPlacementHeader && placement && (
				<Card className="shadow-none! bg-white">
					<CardContent className="py-4">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-semibold text-[#1c1a15]">
									{placement.roleName && `${placement.roleName} @ `}
									{placement.workNodeName}
								</h3>
								{placement.startDate && (
									<p className="text-sm text-[#8a857d]">
										Start: {formatDate(placement.startDate)}
										{daysToStart !== null && daysToStart >= 0 && (
											<span className="ml-2">
												({daysToStart === 0 ? "Today" : `${daysToStart} days`})
											</span>
										)}
									</p>
								)}
							</div>
							<div className="text-right">
								<span className="text-2xl font-bold text-[#1c1a15]">{percentage}%</span>
								<p className="text-sm text-[#8a857d]">
									{completeItems}/{totalItems} complete
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Grouped sections */}
			{GROUP_CONFIG.map((config) => {
				const groupItems = groupedItems[config.key] || [];
				const isExpanded = expandedGroups.has(config.key);
				const isEmpty = groupItems.length === 0;

				// Don't show empty incomplete groups
				if (isEmpty && config.key !== "complete") {
					return null;
				}

				return (
					<Card
						key={config.key}
						className={cn(
							"shadow-none! bg-white transition-colors",
							!isEmpty && config.borderColor
						)}
					>
						<Collapsible
							open={isExpanded}
							onOpenChange={() => toggleGroup(config.key)}
						>
							<CollapsibleTrigger asChild>
								<CardHeader className="py-3 cursor-pointer hover:bg-[#f0ede7]/50 transition-colors">
									<div className="flex items-center justify-between">
										<CardTitle className="text-sm font-medium flex items-center gap-2">
											<span className={config.color}>{config.icon}</span>
											{config.label}
											{!isEmpty && (
												<Badge
													variant="secondary"
													className={cn("ml-1", config.badgeClass)}
												>
													{groupItems.length}
												</Badge>
											)}
										</CardTitle>
										<div className="flex items-center gap-2">
											{/* Quick action for group */}
											{config.key === "candidate" && groupItems.length > 0 && onChaseCandidate && (
												<Button
													variant="ghost"
													size="sm"
													className="h-7 text-xs text-[#6b6760]"
													onClick={(e) => {
														e.stopPropagation();
													}}
												>
													<MessageSquare className="h-3 w-3 mr-1" />
													Chase
												</Button>
											)}
											{isExpanded ? (
												<ChevronUp className="h-4 w-4 text-[#a8a49c]" />
											) : (
												<ChevronDown className="h-4 w-4 text-[#a8a49c]" />
											)}
										</div>
									</div>
								</CardHeader>
							</CollapsibleTrigger>

							<CollapsibleContent>
								<CardContent className="pt-0 pb-3">
									{isEmpty ? (
										<p className="text-sm text-[#8a857d] py-2">
											{config.emptyMessage}
										</p>
									) : (
										<ul className="space-y-2">
											{groupItems.map((item) => (
												<ComplianceItem
													key={item.elementId}
													item={item}
													config={config}
													onChase={
														config.key === "candidate"
															? onChaseCandidate
															: config.key === "third_party"
																? onChaseThirdParty
																: undefined
													}
													onReview={config.key === "admin" ? onReviewItem : undefined}
													onViewEvidence={onViewEvidence}
												/>
											))}
										</ul>
									)}
								</CardContent>
							</CollapsibleContent>
						</Collapsible>
					</Card>
				);
			})}
		</div>
	);
}

/**
 * Individual compliance item row
 */
function ComplianceItem({
	item,
	config,
	onChase,
	onReview,
	onViewEvidence,
}: {
	item: ComplianceItemDisplay;
	config: GroupConfig;
	onChase?: (itemId: string) => void;
	onReview?: (itemId: string) => void;
	onViewEvidence?: (itemId: string) => void;
}) {
	// Build status text based on blocker type
	const getStatusText = () => {
		switch (item.blockedBy) {
			case "candidate":
				if (item.daysWaiting !== undefined) {
					return `No upload \u00b7 ${formatDaysAgo(item.daysWaiting)}`;
				}
				return item.actionRequired || "Awaiting upload";
			case "admin":
				if (item.uploadedAt) {
					const days = Math.floor(
						(Date.now() - new Date(item.uploadedAt).getTime()) / (1000 * 60 * 60 * 24)
					);
					return `Uploaded ${formatDaysAgo(days)} ago`;
				}
				return item.blockingReason || "Under review";
			case "third_party":
				if (item.requestedAt) {
					return `Requested ${formatDate(item.requestedAt)}`;
				}
				return item.blockingReason || "Awaiting response";
			case "complete":
				if (item.expiresAt) {
					const daysToExpiry = daysUntil(item.expiresAt);
					if (daysToExpiry !== null && daysToExpiry <= 30) {
						return `Expires ${formatDate(item.expiresAt)}`;
					}
				}
				return "Verified";
			default:
				return item.blockingReason || "";
		}
	};

	// Check if expiring soon
	const isExpiringSoon =
		item.expiresAt && daysUntil(item.expiresAt) !== null && daysUntil(item.expiresAt)! <= 30;

	return (
		<li className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-[#f0ede7]/50 transition-colors group">
			<div className="flex items-center gap-3 min-w-0 flex-1">
				{/* Status indicator */}
				<div
					className={cn(
						"h-2 w-2 rounded-full shrink-0",
						config.dotColor
					)}
				/>

				{/* Name and status */}
				<div className="min-w-0 flex-1">
					<p className="text-sm font-medium truncate text-[#1c1a15]">{item.elementName}</p>
					<p className="text-xs text-[#8a857d] flex items-center gap-1">
						{item.blockedBy !== "complete" && (
							<Clock className="h-3 w-3" />
						)}
						{getStatusText()}
						{isExpiringSoon && item.blockedBy === "complete" && (
							<Badge variant="outline" className="ml-2 text-xs py-0 h-5 text-[#c49332] border-[#c49332]/30">
								Expiring
							</Badge>
						)}
					</p>
				</div>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
				{/* Primary action based on status */}
				{onChase && item.blockedBy === "candidate" && (
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs text-[#6b6760]"
						onClick={() => onChase(item.elementId)}
					>
						Chase
					</Button>
				)}
				{onReview && item.blockedBy === "admin" && (
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs text-[#6b6760]"
						onClick={() => onReview(item.elementId)}
					>
						Review
					</Button>
				)}
				{onChase && item.blockedBy === "third_party" && (
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs text-[#6b6760]"
						onClick={() => onChase(item.elementId)}
					>
						Chase
					</Button>
				)}

				{/* More actions dropdown */}
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="h-7 w-7 p-0">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{onViewEvidence && (
							<DropdownMenuItem onClick={() => onViewEvidence(item.elementId)}>
								View details
							</DropdownMenuItem>
						)}
						<DropdownMenuItem>Add note</DropdownMenuItem>
						<DropdownMenuItem>View history</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</li>
	);
}
