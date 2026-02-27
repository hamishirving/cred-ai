"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
	DragDropContext,
	Droppable,
	Draggable,
	type DropResult,
} from "@hello-pangea/dnd";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
	type PlacementRow,
	KANBAN_STATUSES,
	STATUS_LABELS,
	STATUS_DOT_COLOR,
	STATUS_BADGE_VARIANT,
	getAvatarColor,
	getInitials,
} from "./constants";

interface PlacementsKanbanProps {
	placements: PlacementRow[];
	loading: boolean;
	onStatusChange: (id: string, status: string) => Promise<void>;
}

export function PlacementsKanban({
	placements,
	loading,
	onStatusChange,
}: PlacementsKanbanProps) {
	const grouped = useMemo(() => {
		const map: Record<string, PlacementRow[]> = {};
		for (const status of KANBAN_STATUSES) {
			map[status] = [];
		}
		for (const p of placements) {
			if (map[p.status]) {
				map[p.status].push(p);
			}
		}
		return map;
	}, [placements]);

	const handleDragEnd = useCallback(
		(result: DropResult) => {
			const { destination, source, draggableId } = result;

			// Dropped outside or in same position
			if (!destination) return;
			if (
				destination.droppableId === source.droppableId &&
				destination.index === source.index
			) {
				return;
			}

			const newStatus = destination.droppableId;
			onStatusChange(draggableId, newStatus);
		},
		[onStatusChange],
	);

	if (loading) {
		return <KanbanSkeleton />;
	}

	return (
		<DragDropContext onDragEnd={handleDragEnd}>
			<div className="flex gap-4 overflow-x-auto pb-4">
				{KANBAN_STATUSES.map((status) => (
					<KanbanColumn
						key={status}
						status={status}
						placements={grouped[status]}
					/>
				))}
			</div>
		</DragDropContext>
	);
}

function KanbanColumn({
	status,
	placements,
}: {
	status: string;
	placements: PlacementRow[];
}) {
	return (
		<div className="w-[280px] min-w-[280px] flex flex-col rounded-lg bg-muted/30">
			{/* Column header */}
			<div className="flex items-center gap-2 px-3 py-2.5">
				<span
					className={cn(
						"h-2 w-2 rounded-full flex-shrink-0",
						STATUS_DOT_COLOR[status],
					)}
				/>
				<span className="text-xs font-medium text-foreground">
					{STATUS_LABELS[status] || status}
				</span>
				<span className="text-xs text-muted-foreground tabular-nums">
					{placements.length}
				</span>
			</div>

			{/* Droppable area */}
			<Droppable droppableId={status}>
				{(provided, snapshot) => (
					<div
						ref={provided.innerRef}
						{...provided.droppableProps}
						className={cn(
							"flex-1 p-2 space-y-2 overflow-y-auto min-h-[calc(100vh-280px)] transition-colors duration-150",
							snapshot.isDraggingOver && "bg-muted/50",
						)}
					>
						{placements.map((placement, index) => (
							<KanbanCard
								key={placement.id}
								placement={placement}
								index={index}
							/>
						))}
						{provided.placeholder}
					</div>
				)}
			</Droppable>
		</div>
	);
}

function KanbanCard({
	placement,
	index,
}: {
	placement: PlacementRow;
	index: number;
}) {
	const router = useRouter();

	const complianceColor =
		placement.compliancePercentage >= 80
			? "text-[var(--positive)]"
			: placement.compliancePercentage >= 50
				? "text-[var(--warning)]"
				: "text-destructive";

	const dealVariant = placement.dealType
		? STATUS_BADGE_VARIANT[placement.dealType] || "neutral"
		: null;

	return (
		<Draggable draggableId={placement.id} index={index}>
			{(provided, snapshot) => (
				<div
					ref={provided.innerRef}
					{...provided.draggableProps}
					{...provided.dragHandleProps}
					role="button"
					tabIndex={0}
					onClick={() => {
						if (!snapshot.isDragging) {
							router.push(`/placements/${placement.id}`);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !snapshot.isDragging) {
							router.push(`/placements/${placement.id}`);
						}
					}}
					className={cn(
						"bg-card border border-border rounded-md p-3 cursor-pointer",
						"transition-shadow duration-150",
						"hover:shadow-sm",
						"focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
						snapshot.isDragging && "shadow-md",
					)}
				>
					{/* Top row: avatar + name + compliance */}
					<div className="flex items-center gap-2">
						<Avatar className="h-6 w-6 flex-shrink-0">
							<AvatarFallback
								className={cn(
									getAvatarColor(placement.candidateName),
									"text-[8px] text-white",
								)}
							>
								{getInitials(placement.candidateName)}
							</AvatarFallback>
						</Avatar>
						<span className="text-sm font-medium truncate flex-1">
							{placement.candidateName}
						</span>
						<span
							className={cn(
								"text-sm font-semibold tabular-nums shrink-0",
								complianceColor,
							)}
						>
							{placement.compliancePercentage}%
						</span>
					</div>

					{/* Role + facility */}
					<p className="mt-1.5 text-xs text-muted-foreground truncate">
						{placement.roleName}
					</p>
					<p className="text-xs text-muted-foreground truncate">
						{placement.facilityName}
					</p>

					{/* Bottom row: start date + deal type */}
					<div className="mt-2 flex items-center justify-between">
						{placement.startDate ? (
							<span className="text-[11px] text-muted-foreground tabular-nums">
								Start: {new Date(placement.startDate).toLocaleDateString("en-GB", {
									day: "numeric",
									month: "short",
								})}
							</span>
						) : (
							<span className="text-[11px] text-muted-foreground">Start: TBC</span>
						)}
						{dealVariant && (
							<Badge variant={dealVariant} className="text-[10px] px-1.5 py-0">
								{placement.dealType}
							</Badge>
						)}
					</div>
				</div>
			)}
		</Draggable>
	);
}

function KanbanSkeleton() {
	return (
		<div className="flex gap-4 overflow-x-auto pb-4">
			{KANBAN_STATUSES.map((status) => (
				<div
					key={status}
					className="w-[280px] min-w-[280px] flex flex-col rounded-lg bg-muted/30"
				>
					{/* Header skeleton */}
					<div className="flex items-center gap-2 px-3 py-2.5">
						<Skeleton className="h-2 w-2 rounded-full" />
						<Skeleton className="h-3.5 w-20" />
						<Skeleton className="h-3 w-4" />
					</div>

					{/* Card skeletons */}
					<div className="p-2 space-y-2 min-h-[calc(100vh-280px)]">
						{Array.from({ length: 3 }).map((_, i) => (
							<div
								key={i}
								className="bg-card border border-border rounded-md p-3"
							>
								<div className="flex items-center gap-2">
									<Skeleton className="h-6 w-6 rounded-full" />
									<Skeleton className="h-3.5 w-[120px]" />
								</div>
								<Skeleton className="mt-1.5 h-3 w-[100px]" />
								<Skeleton className="mt-1 h-3 w-[80px]" />
								<div className="mt-2 flex items-center justify-between">
									<Skeleton className="h-3 w-8" />
								</div>
							</div>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
