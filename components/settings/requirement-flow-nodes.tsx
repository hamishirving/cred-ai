"use client";

import { memo } from "react";
import { Handle, Position, type Node } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================
// Layer colours
// ============================================

export const LAYER_COLORS: Record<string, { border: string; text: string; bg: string }> = {
	federal: {
		border: "#4444cf",
		text: "text-[#4444cf]",
		bg: "bg-[#eeedf8]",
	},
	role: {
		border: "#3a9960",
		text: "text-[#3a9960]",
		bg: "bg-[#eef6f1]",
	},
	state: {
		border: "#c49332",
		text: "text-[#c49332]",
		bg: "bg-[#faf5eb]",
	},
	facility: {
		border: "#8a857d",
		text: "text-[#6b6760]",
		bg: "bg-[#f0ede7]",
	},
	conditional: {
		border: "#c93d4e",
		text: "text-[#c93d4e]",
		bg: "bg-[#fdf0f1]",
	},
};

const ELEMENT_CATEGORY_DOTS: Record<string, string> = {
	identity: "bg-[#4444cf]",
	professional: "bg-[#3a9960]",
	training: "bg-[#c49332]",
	health: "bg-[#c93d4e]",
	orientation: "bg-[#6b6760]",
};

// ============================================
// Data types
// ============================================

export type LayerNodeData = Record<string, unknown> & {
	layerName: string;
	layerType: string;
	packageName: string | null;
	reason: string | null;
	elements: Array<{
		slug: string;
		name: string;
		category: string | null;
		scope: string;
	}>;
	active: boolean;
};

export type ContextNodeData = Record<string, unknown> & {
	role: string;
	jurisdiction: string;
	facilityType: string;
	dealType: string;
};

export type SummaryNodeData = Record<string, unknown> & {
	total: number;
	candidateScoped: number;
	placementScoped: number;
	faHandled: number;
	carryForwardEligible: number;
	packageCount: number;
};

export interface ConditionCheck {
	label: string;
	description: string;
	active: boolean;
}

export type ConditionGateNodeData = Record<string, unknown> & {
	conditions: ConditionCheck[];
	anyTriggered: boolean;
};

export type LayerNodeType = Node<LayerNodeData, "layerNode">;
export type ContextNodeType = Node<ContextNodeData, "contextNode">;
export type SummaryNodeType = Node<SummaryNodeData, "summaryNode">;
export type ConditionGateNodeType = Node<ConditionGateNodeData, "conditionGateNode">;

// ============================================
// Layer Node
// ============================================

function LayerNodeComponent({ data }: { data: LayerNodeData }) {
	const colors = LAYER_COLORS[data.layerType] || LAYER_COLORS.federal;

	return (
		<div
			className={cn(
				"min-w-[240px] max-w-[280px] rounded-lg border bg-card overflow-hidden transition-opacity duration-200",
				!data.active && "opacity-40",
			)}
			style={{
				borderTopWidth: 3,
				borderTopColor: colors.border,
			}}
		>
			<Handle
				type="target"
				position={Position.Left}
				className="!w-2 !h-2 !border !border-background"
				style={{ background: colors.border }}
			/>

			{/* Header */}
			<div className="px-3 py-2 border-b">
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-semibold">{data.layerName}</span>
					{data.active && data.elements.length > 0 && (
						<Badge
							variant="secondary"
							className="text-[10px] px-1.5 py-0 h-4 tabular-nums"
						>
							{data.elements.length}
						</Badge>
					)}
				</div>
				{data.active && data.packageName ? (
					<p className="text-[11px] text-muted-foreground mt-0.5 truncate">
						{data.packageName}
					</p>
				) : null}
				{data.active && data.reason ? (
					<Badge
						variant="outline"
						className={cn(
							"mt-1 text-[10px] px-1.5 py-0 h-4",
							colors.text,
						)}
					>
						{data.reason}
					</Badge>
				) : null}
			</div>

			{/* Elements or empty state */}
			<div className="max-h-[200px] overflow-y-auto">
				{data.active && data.elements.length > 0 ? (
					<div className="divide-y divide-border/50">
						{data.elements.map((el) => (
							<div
								key={el.slug}
								className="flex items-center gap-2 px-3 py-1 text-[11px]"
							>
								<span
									className={cn(
										"h-1.5 w-1.5 rounded-full shrink-0",
										ELEMENT_CATEGORY_DOTS[el.category || ""] ||
											"bg-muted-foreground",
									)}
								/>
								<span className="flex-1 truncate">{el.name}</span>
								<span className="text-muted-foreground text-[10px] shrink-0">
									{el.scope === "candidate" ? "C" : "P"}
								</span>
							</div>
						))}
					</div>
				) : (
					<p className="px-3 py-3 text-[11px] text-muted-foreground italic">
						No requirements at this layer
					</p>
				)}
			</div>

			<Handle
				type="source"
				position={Position.Right}
				className="!w-2 !h-2 !border !border-background"
				style={{ background: colors.border }}
			/>
		</div>
	);
}

// ============================================
// Context Node
// ============================================

function ContextNodeComponent({ data }: { data: ContextNodeData }) {
	const items = [
		{ label: "Role", value: data.role },
		{ label: "State", value: data.jurisdiction },
		{ label: "Facility", value: data.facilityType },
		{ label: "Deal", value: data.dealType },
	];

	return (
		<div className="min-w-[180px] rounded-lg border-2 border-[#4444cf] bg-card overflow-hidden">
			<div className="px-3 py-2 bg-[#eeedf8] border-b">
				<span className="text-xs font-semibold text-[#4444cf]">
					Placement Context
				</span>
			</div>
			<div className="divide-y divide-border/50">
				{items.map((item) => (
					<div
						key={item.label}
						className="flex items-center justify-between px-3 py-1.5 text-[11px]"
					>
						<span className="text-muted-foreground">{item.label}</span>
						<span className="font-medium capitalize">{item.value || "—"}</span>
					</div>
				))}
			</div>

			<Handle
				type="source"
				position={Position.Right}
				className="!w-2 !h-2 !bg-[#4444cf] !border !border-background"
			/>
		</div>
	);
}

// ============================================
// Summary Node
// ============================================

function SummaryNodeComponent({ data }: { data: SummaryNodeData }) {
	const stats = [
		{ label: "Total", value: data.total },
		{ label: "Candidate", value: data.candidateScoped },
		{ label: "Placement", value: data.placementScoped },
		{ label: "FA-handled", value: data.faHandled },
		{ label: "Carry-forward", value: data.carryForwardEligible },
		{ label: "Packages", value: data.packageCount },
	];

	return (
		<div className="min-w-[180px] rounded-lg border-2 border-[#3a9960] bg-card overflow-hidden">
			<Handle
				type="target"
				position={Position.Left}
				className="!w-2 !h-2 !bg-[#3a9960] !border !border-background"
			/>

			<div className="px-3 py-2 bg-[#eef6f1] border-b">
				<span className="text-xs font-semibold text-[#3a9960]">
					Resolved Requirements
				</span>
			</div>
			<div className="grid grid-cols-2 gap-px bg-border/50">
				{stats.map((stat) => (
					<div
						key={stat.label}
						className="bg-card px-3 py-2 flex flex-col items-center"
					>
						<span className="text-lg font-semibold tabular-nums leading-tight">
							{stat.value}
						</span>
						<span className="text-[10px] text-muted-foreground">
							{stat.label}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================
// Condition Gate Node
// ============================================

function ConditionGateNodeComponent({ data }: { data: ConditionGateNodeData }) {
	return (
		<div
			className="min-w-[200px] rounded-lg border bg-card overflow-hidden"
			style={{
				borderTopWidth: 3,
				borderTopColor: data.anyTriggered ? "#c93d4e" : "#ccc8c0",
			}}
		>
			<Handle
				type="target"
				position={Position.Left}
				className="!w-2 !h-2 !border !border-background"
				style={{ background: data.anyTriggered ? "#c93d4e" : "#ccc8c0" }}
			/>

			<div className="px-3 py-2 border-b">
				<span className="text-xs font-semibold">Conditional Triggers</span>
				<p className="text-[10px] text-muted-foreground mt-0.5">
					Any match adds requirements
				</p>
			</div>

			<div className="divide-y divide-border/50">
				{data.conditions.map((cond) => (
					<div
						key={cond.label}
						className="flex items-start gap-2 px-3 py-1.5"
					>
						<span
							className={cn(
								"mt-0.5 shrink-0 text-[11px] leading-none",
								cond.active ? "text-[#c93d4e]" : "text-[#ccc8c0]",
							)}
						>
							{cond.active ? "●" : "○"}
						</span>
						<div className="min-w-0">
							<span
								className={cn(
									"text-[11px] font-medium block",
									!cond.active && "text-muted-foreground",
								)}
							>
								{cond.label}
							</span>
							<span className="text-[10px] text-muted-foreground block">
								{cond.description}
							</span>
						</div>
					</div>
				))}
			</div>

			<Handle
				type="source"
				position={Position.Right}
				className="!w-2 !h-2 !border !border-background"
				style={{ background: data.anyTriggered ? "#c93d4e" : "#ccc8c0" }}
			/>
		</div>
	);
}

// ============================================
// Exports (memoised)
// ============================================

export const LayerNode = memo(LayerNodeComponent);
export const ContextNode = memo(ContextNodeComponent);
export const SummaryNode = memo(SummaryNodeComponent);
export const ConditionGateNode = memo(ConditionGateNodeComponent);
