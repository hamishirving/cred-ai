"use client";

import { Handle, type Node, Position } from "@xyflow/react";
import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ============================================
// Layer styles — backed by CSS tokens in globals.css
// ============================================

type LayerStyle = {
	/** CSS var ref — for inline styles (React Flow edges, border-top accents) */
	color: string;
	/** Tailwind utility classes backed by the same token */
	textClass: string;
	bgClass: string;
	borderClass: string;
};

export const LAYER_STYLES: Record<string, LayerStyle> = {
	federal: {
		color: "var(--layer-federal)",
		textClass: "text-layer-federal",
		bgClass: "bg-layer-federal-subtle",
		borderClass: "border-layer-federal",
	},
	role: {
		color: "var(--layer-role)",
		textClass: "text-layer-role",
		bgClass: "bg-layer-role-subtle",
		borderClass: "border-layer-role",
	},
	state: {
		color: "var(--layer-state)",
		textClass: "text-layer-state",
		bgClass: "bg-layer-state-subtle",
		borderClass: "border-layer-state",
	},
	facility: {
		color: "var(--layer-facility)",
		textClass: "text-layer-facility",
		bgClass: "bg-layer-facility-subtle",
		borderClass: "border-layer-facility",
	},
	conditional: {
		color: "var(--layer-conditional)",
		textClass: "text-layer-conditional",
		bgClass: "bg-layer-conditional-subtle",
		borderClass: "border-layer-conditional",
	},
};

/** Kept as alias so external consumers keep working. */
export const LAYER_COLORS = LAYER_STYLES;

/** Muted/inactive stroke color for unreachable edges/nodes */
export const INACTIVE_STROKE = "var(--border)";

const ELEMENT_CATEGORY_DOTS: Record<string, string> = {
	identity: "bg-primary",
	professional: "bg-positive",
	training: "bg-warning",
	health: "bg-negative",
	orientation: "bg-muted-foreground",
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
export type ConditionGateNodeType = Node<
	ConditionGateNodeData,
	"conditionGateNode"
>;

// ============================================
// Layer Node
// ============================================

function LayerNodeComponent({ data }: { data: LayerNodeData }) {
	const style = LAYER_STYLES[data.layerType] || LAYER_STYLES.federal;

	return (
		<div
			className={cn(
				"min-w-[240px] max-w-[280px] rounded-lg border bg-card overflow-hidden transition-opacity duration-200",
				!data.active && "opacity-40",
			)}
			style={{
				borderTopWidth: 3,
				borderTopColor: style.color,
			}}
		>
			<Handle
				type="target"
				position={Position.Left}
				className="!w-2 !h-2 !border !border-background"
				style={{ background: style.color }}
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
						className={cn("mt-1 text-[10px] px-1.5 py-0 h-4", style.textClass)}
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
				style={{ background: style.color }}
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
		<div className="min-w-[180px] rounded-lg border-2 border-layer-federal bg-card overflow-hidden">
			<div className="px-3 py-2 bg-layer-federal-subtle border-b">
				<span className="text-xs font-semibold text-layer-federal">
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
				className="!w-2 !h-2 !bg-layer-federal !border !border-background"
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
		<div className="min-w-[180px] rounded-lg border-2 border-layer-role bg-card overflow-hidden">
			<Handle
				type="target"
				position={Position.Left}
				className="!w-2 !h-2 !bg-layer-role !border !border-background"
			/>

			<div className="px-3 py-2 bg-layer-role-subtle border-b">
				<span className="text-xs font-semibold text-layer-role">
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
	const accentColor = data.anyTriggered
		? "var(--layer-conditional)"
		: INACTIVE_STROKE;

	return (
		<div
			className="min-w-[200px] rounded-lg border bg-card overflow-hidden"
			style={{
				borderTopWidth: 3,
				borderTopColor: accentColor,
			}}
		>
			<Handle
				type="target"
				position={Position.Left}
				className="!w-2 !h-2 !border !border-background"
				style={{ background: accentColor }}
			/>

			<div className="px-3 py-2 border-b">
				<span className="text-xs font-semibold">Conditional Triggers</span>
				<p className="text-[10px] text-muted-foreground mt-0.5">
					Any match adds requirements
				</p>
			</div>

			<div className="divide-y divide-border/50">
				{data.conditions.map((cond) => (
					<div key={cond.label} className="flex items-start gap-2 px-3 py-1.5">
						<span
							className={cn(
								"mt-0.5 shrink-0 text-[11px] leading-none",
								cond.active
									? "text-layer-conditional"
									: "text-muted-foreground/60",
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
				style={{ background: accentColor }}
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
