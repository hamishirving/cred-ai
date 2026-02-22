"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface WorkNodeDetail {
	id: string;
	name: string;
	typeName: string;
	jurisdiction: string | null;
	address: string | null;
	hierarchyPath: { id: string; name: string; typeName: string }[];
	activePlacements: {
		id: string;
		candidateName: string;
		roleName: string;
		status: string;
		compliancePercentage: number;
	}[];
}

const STATUS_BADGE_VARIANT: Record<string, "neutral" | "info" | "warning" | "success" | "danger"> = {
	pending: "neutral",
	onboarding: "info",
	compliance: "warning",
	ready: "success",
	active: "success",
};

interface FacilityDetailDialogProps {
	workNodeId: string;
	facilityName: string;
	jurisdiction: string | null;
	currentPlacementId: string;
}

export function FacilityDetailDialog({
	workNodeId,
	facilityName,
	jurisdiction,
	currentPlacementId,
}: FacilityDetailDialogProps) {
	const [open, setOpen] = useState(false);
	const [data, setData] = useState<WorkNodeDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);

	useEffect(() => {
		if (!open || data) return;

		let cancelled = false;
		setLoading(true);
		setError(false);

		fetch(`/api/facilities/${workNodeId}`)
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch");
				return res.json();
			})
			.then((json) => {
				if (!cancelled) setData(json);
			})
			.catch(() => {
				if (!cancelled) setError(true);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [open, data, workNodeId]);

	const otherPlacements = data?.activePlacements.filter(
		(p) => p.id !== currentPlacementId,
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors duration-150 cursor-pointer"
			>
				<Building2 className="size-3.5 shrink-0" aria-hidden="true" />
				{facilityName}
				{jurisdiction && (
					<span className="capitalize">, {jurisdiction}</span>
				)}
			</button>

			<DialogContent className="max-w-md gap-0 p-0">
				{/* Header — always rendered for accessibility */}
				<DialogHeader className="px-5 pt-5 pb-3">
					<div className="flex items-center gap-2">
						<DialogTitle className="text-base font-semibold">
							{data?.name ?? facilityName}
						</DialogTitle>
						{data && (
							<Badge variant="neutral" className="text-[11px] font-medium shrink-0">
								{data.typeName}
							</Badge>
						)}
					</div>
					<DialogDescription className="sr-only">
						Facility details for {data?.name ?? facilityName}
					</DialogDescription>
				</DialogHeader>

				{loading ? (
					<FacilitySkeleton />
				) : error ? (
					<div className="px-5 pb-5">
						<p className="text-sm text-muted-foreground">
							Failed to load facility details.
						</p>
					</div>
				) : data ? (
					<>

						{/* Hierarchy breadcrumb */}
						{data.hierarchyPath.length > 1 && (
							<div className="flex items-center gap-1 px-5 pb-3 flex-wrap">
								{data.hierarchyPath.map((node, i) => (
									<span key={node.id} className="flex items-center gap-1">
										{i > 0 && (
											<ChevronRight className="size-3 text-muted-foreground shrink-0" />
										)}
										<span
											className={cn(
												"text-xs",
												i === data.hierarchyPath.length - 1
													? "font-medium text-foreground"
													: "text-muted-foreground",
											)}
										>
											{node.name}
										</span>
									</span>
								))}
							</div>
						)}

						{/* Details */}
						<div className="border-t border-border px-5 py-3 space-y-2">
							{data.jurisdiction && (
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground w-20 shrink-0">
										Jurisdiction
									</span>
									<span className="text-sm capitalize">
										{data.jurisdiction}
									</span>
								</div>
							)}
							{data.address && (
								<div className="flex items-start gap-2">
									<span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">
										Address
									</span>
									<span className="text-sm flex items-start gap-1.5">
										<MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
										{data.address}
									</span>
								</div>
							)}
						</div>

						{/* Active placements */}
						<div className="border-t border-border px-5 py-3">
							<p className="text-xs font-medium text-muted-foreground mb-2">
								Active Placements
								{otherPlacements && otherPlacements.length > 0 && (
									<span className="ml-1">({otherPlacements.length})</span>
								)}
							</p>

							{otherPlacements && otherPlacements.length > 0 ? (
								<div className="space-y-1">
									{otherPlacements.map((p) => (
										<Link
											key={p.id}
											href={`/placements/${p.id}`}
											onClick={() => setOpen(false)}
											className="flex items-center gap-3 rounded-md px-2 py-2 -mx-2 hover:bg-muted/50 transition-colors duration-150"
										>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">
													{p.candidateName}
												</p>
												<p className="text-xs text-muted-foreground">
													{p.roleName}
												</p>
											</div>
											<Badge
												variant={STATUS_BADGE_VARIANT[p.status] || "neutral"}
												className="text-[11px] capitalize shrink-0"
											>
												{p.status}
											</Badge>
											<span
												className={cn(
													"text-xs tabular-nums font-medium shrink-0",
													p.compliancePercentage >= 80
														? "text-[var(--positive)]"
														: p.compliancePercentage >= 50
															? "text-[var(--warning)]"
															: "text-destructive",
												)}
											>
												{p.compliancePercentage}%
											</span>
										</Link>
									))}
								</div>
							) : (
								<p className="text-xs text-muted-foreground">
									No other active placements at this facility.
								</p>
							)}
						</div>
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function FacilitySkeleton() {
	return (
		<div className="p-5 space-y-4">
			<div className="flex items-center gap-2">
				<Skeleton className="h-5 w-40" />
				<Skeleton className="h-5 w-16 rounded-full" />
			</div>
			<div className="flex items-center gap-1">
				<Skeleton className="h-3.5 w-20" />
				<Skeleton className="h-3.5 w-3" />
				<Skeleton className="h-3.5 w-32" />
			</div>
			<Skeleton className="h-px w-full" />
			<div className="space-y-2">
				<Skeleton className="h-4 w-48" />
				<Skeleton className="h-4 w-56" />
			</div>
			<Skeleton className="h-px w-full" />
			<Skeleton className="h-3.5 w-28" />
			<Skeleton className="h-10 w-full rounded-md" />
		</div>
	);
}
