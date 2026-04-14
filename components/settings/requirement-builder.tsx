"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ReactFlow,
	Background,
	Controls,
	BackgroundVariant,
	useNodesState,
	useEdgesState,
	type Node,
	type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "@dagrejs/dagre";
import {
	AlertTriangle,
	ChevronDown,
	ChevronRight,
	ChevronUp,
} from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
	LayerNode,
	ContextNode,
	SummaryNode,
	ConditionGateNode,
	INACTIVE_STROKE,
	LAYER_STYLES,
	type LayerNodeData,
	type ContextNodeData,
	type SummaryNodeData,
	type ConditionGateNodeData,
	type ConditionCheck,
} from "./requirement-flow-nodes";
import type { PackageData, RoleData } from "./compliance-settings";
import type { ResolveResponse } from "@/app/api/compliance/resolve/route";
import type { RequirementGroup } from "@/lib/compliance/resolve-requirements";

// ============================================
// Node types registration
// ============================================

const nodeTypes = {
	layerNode: LayerNode,
	contextNode: ContextNode,
	summaryNode: SummaryNode,
	conditionGateNode: ConditionGateNode,
};

// ============================================
// Layer definitions
// ============================================

interface LayerDef {
	id: string;
	name: string;
	type: string;
	matchesGroup: (group: RequirementGroup) => boolean;
}

/** The 4 standard layers that always connect from context */
const LAYERS: LayerDef[] = [
	{
		id: "federal",
		name: "Federal Core",
		type: "federal",
		matchesGroup: (g) => g.packageSlug === "federal-core-package",
	},
	{
		id: "role",
		name: "Role",
		type: "role",
		matchesGroup: (g) =>
			g.reason.startsWith("role:") && g.packageSlug !== "federal-core-package",
	},
	{
		id: "state",
		name: "State",
		type: "state",
		matchesGroup: (g) => g.reason.startsWith("state:"),
	},
	{
		id: "facility",
		name: "Facility",
		type: "facility",
		matchesGroup: (g) => g.reason.startsWith("facility:"),
	},
];

/** Human-readable condition trigger names */
const CONDITION_TRIGGER_LABELS: Record<string, string> = {
	"conditional:lapse-deal": "Lapse Deal",
	"conditional:facility-requirement": "Facility Requirement",
};

// ============================================
// Pre-defined conditions
// ============================================

interface PreDefinedCondition {
	id: string;
	name: string;
	description: string;
	/** The underlying rules that make up this condition */
	rules: Array<{ property: string; operator: string; value: string }>;
	/** Which resolution flag(s) this condition sets */
	flags: {
		isLapseDeal?: boolean;
		stateRequiresOigSam?: boolean;
		facilityRequiresOigSam?: boolean;
	};
}

/**
 * These represent the org's configured conditions.
 * In future these would come from the DB. For now they're
 * hardcoded to demonstrate the concept.
 */
const PRE_DEFINED_CONDITIONS: PreDefinedCondition[] = [
	{
		id: "lapse-deal",
		name: "Lapse deal",
		description:
			"Candidate returning after extended inactivity. Triggers tier-2 exclusion screening.",
		rules: [
			{
				property: "Placement type",
				operator: "equals",
				value: "Lapse (inactive 90+ days)",
			},
		],
		flags: { isLapseDeal: true },
	},
	{
		id: "state-oig-sam",
		name: "State OIG/SAM mandate",
		description:
			"State law requires federal exclusion database screening for all placements.",
		rules: [
			{
				property: "State policy",
				operator: "requires",
				value: "OIG/SAM screening",
			},
		],
		flags: { stateRequiresOigSam: true },
	},
	{
		id: "facility-oig-sam",
		name: "Facility exclusion screening",
		description:
			"Facility contract mandates OIG/SAM checks regardless of state requirements.",
		rules: [
			{
				property: "Facility contract",
				operator: "requires",
				value: "OIG/SAM screening",
			},
		],
		flags: { facilityRequiresOigSam: true },
	},
];

function getConditionLabel(reason: string): string {
	if (CONDITION_TRIGGER_LABELS[reason]) return CONDITION_TRIGGER_LABELS[reason];
	if (reason.startsWith("conditional:state-mandate:")) {
		const state = reason.split(":")[2];
		return `State Mandate (${state})`;
	}
	return "Conditional";
}

// ============================================
// Layout helper
// ============================================

function estimateLayerNodeHeight(data: LayerNodeData): number {
	// Header: name row (34px) + border-b (1px)
	let h = 35;
	if (data.active && data.packageName) h += 18;
	if (data.active && data.reason) h += 24;
	// Element list capped at max-h-[200px] in CSS
	if (data.active && data.elements.length > 0) {
		h += Math.min(data.elements.length * 23, 200);
	} else {
		h += 38; // empty state
	}
	return h;
}

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
	const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
	g.setGraph({
		rankdir: "LR",
		nodesep: 60,
		ranksep: 100,
		marginx: 40,
		marginy: 40,
	});

	for (const node of nodes) {
		let width = 200;
		let height = 180;
		if (node.type === "layerNode") {
			width = 260;
			height = estimateLayerNodeHeight(node.data as LayerNodeData);
		}
		if (node.type === "conditionGateNode") {
			width = 220;
			height = 160;
		}
		g.setNode(node.id, { width, height });
	}

	for (const edge of edges) {
		g.setEdge(edge.source, edge.target);
	}

	Dagre.layout(g);

	return nodes.map((node) => {
		const dagreNode = g.node(node.id);
		if (!dagreNode) return node;
		return {
			...node,
			position: {
				x: dagreNode.x - (dagreNode.width ?? 0) / 2,
				y: dagreNode.y - (dagreNode.height ?? 0) / 2,
			},
		};
	});
}

// ============================================
// Build graph from resolution result
// ============================================

function buildGraph(
	result: ResolveResponse | null,
	context: {
		role: string;
		jurisdiction: string;
		facilityType: string;
		dealType: string;
		isLapseDeal: boolean;
		stateRequiresOigSam: boolean;
		facilityRequiresOigSam: boolean;
	},
	enabledConditions: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
	const nodes: Node[] = [];
	const edges: Edge[] = [];

	// Context node
	nodes.push({
		id: "context",
		type: "contextNode",
		position: { x: 0, y: 0 },
		data: {
			role: context.role,
			jurisdiction: context.jurisdiction,
			facilityType: context.facilityType,
			dealType: context.dealType,
		} satisfies ContextNodeData,
	});

	// Standard layer nodes (federal, role, state, facility)
	for (const layer of LAYERS) {
		const matchingGroups =
			result?.groups.filter((g) => layer.matchesGroup(g)) ?? [];
		const isActive = matchingGroups.length > 0;
		const elements = matchingGroups.flatMap((g) =>
			g.elements.map((e) => ({
				slug: e.slug,
				name: e.name,
				category: e.category,
				scope: e.scope,
			})),
		);

		nodes.push({
			id: layer.id,
			type: "layerNode",
			position: { x: 0, y: 0 },
			data: {
				layerName: layer.name,
				layerType: layer.type,
				packageName: matchingGroups[0]?.packageName ?? null,
				reason: matchingGroups[0]?.reason ?? null,
				elements,
				active: isActive,
			} satisfies LayerNodeData,
		});

		// Edge from context to layer
		const style = LAYER_STYLES[layer.type] || LAYER_STYLES.federal;
		edges.push({
			id: `context-${layer.id}`,
			source: "context",
			target: layer.id,
			type: "smoothstep",
			animated: isActive,
			style: {
				stroke: isActive ? style.color : INACTIVE_STROKE,
				strokeWidth: isActive ? 2 : 1,
				opacity: isActive ? 1 : 0.3,
			},
		});
	}

	// Conditional groups from the resolution
	const conditionalGroups =
		result?.groups.filter((g) => g.reason.startsWith("conditional:")) ?? [];
	const conditionalActive = conditionalGroups.length > 0;

	// Build condition checks from pre-defined conditions
	const conditions: ConditionCheck[] = PRE_DEFINED_CONDITIONS.map((cond) => ({
		label: cond.name,
		description: cond.rules
			.map((r) => `${r.property} ${r.operator} ${r.value}`)
			.join(", "),
		active: enabledConditions.has(cond.id),
	}));

	// Condition gate node
	nodes.push({
		id: "condition-gate",
		type: "conditionGateNode",
		position: { x: 0, y: 0 },
		data: {
			conditions,
			anyTriggered: conditionalActive,
		} satisfies ConditionGateNodeData,
	});

	// Edge: context → condition gate
	edges.push({
		id: "context-condition-gate",
		source: "context",
		target: "condition-gate",
		type: "smoothstep",
		animated: false,
		style: {
			stroke: conditionalActive
				? "var(--layer-conditional)"
				: INACTIVE_STROKE,
			strokeWidth: conditionalActive ? 2 : 1,
			opacity: conditionalActive ? 1 : 0.3,
			strokeDasharray: conditionalActive ? undefined : "5 5",
		},
	});

	// Conditional layer node — shows what triggered and the requirements
	const conditionalElements = conditionalGroups.flatMap((g) =>
		g.elements.map((e) => ({
			slug: e.slug,
			name: e.name,
			category: e.category,
			scope: e.scope,
		})),
	);
	const triggerLabel = conditionalActive
		? getConditionLabel(conditionalGroups[0].reason)
		: null;

	nodes.push({
		id: "conditional",
		type: "layerNode",
		position: { x: 0, y: 0 },
		data: {
			layerName: triggerLabel ? `Conditional: ${triggerLabel}` : "Conditional",
			layerType: "conditional",
			packageName: conditionalGroups[0]?.packageName ?? null,
			reason: conditionalGroups[0]?.reason ?? null,
			elements: conditionalElements,
			active: conditionalActive,
		} satisfies LayerNodeData,
	});

	// Edge: condition gate → conditional layer
	edges.push({
		id: "condition-gate-conditional",
		source: "condition-gate",
		target: "conditional",
		type: "smoothstep",
		animated: conditionalActive,
		style: {
			stroke: conditionalActive
				? "var(--layer-conditional)"
				: INACTIVE_STROKE,
			strokeWidth: conditionalActive ? 2 : 1,
			opacity: conditionalActive ? 1 : 0.3,
		},
	});

	// Summary node
	nodes.push({
		id: "summary",
		type: "summaryNode",
		position: { x: 0, y: 0 },
		data: {
			total: result?.summary.total ?? 0,
			candidateScoped: result?.summary.candidateScoped ?? 0,
			placementScoped: result?.summary.placementScoped ?? 0,
			faHandled: result?.summary.faHandled ?? 0,
			carryForwardEligible: result?.summary.carryForwardEligible ?? 0,
			packageCount: result?.groups.length ?? 0,
		} satisfies SummaryNodeData,
	});

	// Edges: standard active layers → summary
	for (const layer of LAYERS) {
		const matchingGroups =
			result?.groups.filter((g) => layer.matchesGroup(g)) ?? [];
		if (matchingGroups.length > 0) {
			const style = LAYER_STYLES[layer.type] || LAYER_STYLES.federal;
			edges.push({
				id: `${layer.id}-summary`,
				source: layer.id,
				target: "summary",
				type: "smoothstep",
				animated: true,
				style: {
					stroke: style.color,
					strokeWidth: 2,
				},
			});
		}
	}

	// Edge: conditional layer → summary (if active)
	if (conditionalActive) {
		edges.push({
			id: "conditional-summary",
			source: "conditional",
			target: "summary",
			type: "smoothstep",
			animated: true,
			style: {
				stroke: "var(--layer-conditional)",
				strokeWidth: 2,
			},
		});
	}

	const laidOutNodes = applyDagreLayout(nodes, edges);
	return { nodes: laidOutNodes, edges };
}

// ============================================
// Component
// ============================================

interface RequirementBuilderProps {
	organisationId: string;
	roles: RoleData[];
	jurisdictions: string[];
	facilityTypes: string[];
	packages: PackageData[];
	rolePackageMapping: Record<string, string[]>;
}

export function RequirementBuilder({
	organisationId,
	roles,
	jurisdictions,
	facilityTypes,
}: RequirementBuilderProps) {
	// Selection state — default jurisdiction/facility to "none" (no state/facility-specific package)
	const [roleSlug, setRoleSlug] = useState(roles[0]?.slug ?? "");
	const [jurisdiction, setJurisdiction] = useState("none");
	const [facilityType, setFacilityType] = useState("none");

	// Pre-defined conditions — toggle on/off by ID
	const [enabledConditions, setEnabledConditions] = useState<Set<string>>(
		new Set(),
	);
	const [conditionsExpanded, setConditionsExpanded] = useState(false);
	const [expandedConditionId, setExpandedConditionId] = useState<string | null>(
		null,
	);

	// Derive resolution flags from enabled conditions
	const { isLapseDeal, stateRequiresOigSam, facilityRequiresOigSam } =
		useMemo(() => {
			const flags = {
				isLapseDeal: false,
				stateRequiresOigSam: false,
				facilityRequiresOigSam: false,
			};
			for (const cond of PRE_DEFINED_CONDITIONS) {
				if (enabledConditions.has(cond.id)) {
					if (cond.flags.isLapseDeal) flags.isLapseDeal = true;
					if (cond.flags.stateRequiresOigSam) flags.stateRequiresOigSam = true;
					if (cond.flags.facilityRequiresOigSam)
						flags.facilityRequiresOigSam = true;
				}
			}
			return flags;
		}, [enabledConditions]);
	const activeConditionCount = enabledConditions.size;

	// Resolution state
	const [result, setResult] = useState<ResolveResponse | null>(null);
	const [loading, setLoading] = useState(false);

	// Resolve on any change
	const resolve = useCallback(async () => {
		if (!roleSlug) return;

		setLoading(true);
		try {
			const res = await fetch("/api/compliance/resolve", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					organisationId,
					roleSlug,
					jurisdiction: jurisdiction === "none" ? "" : jurisdiction,
					facilityType: facilityType === "none" ? "" : facilityType,
					isLapseDeal,
					stateRequiresOigSam,
					facilityRequiresOigSam,
				}),
			});
			if (res.ok) {
				const data = await res.json();
				setResult(data);
			}
		} catch (err) {
			console.error("Failed to resolve:", err);
		} finally {
			setLoading(false);
		}
	}, [
		organisationId,
		roleSlug,
		jurisdiction,
		facilityType,
		isLapseDeal,
		stateRequiresOigSam,
		facilityRequiresOigSam,
	]);

	useEffect(() => {
		resolve();
	}, [resolve]);

	// Build graph
	const context = useMemo(
		() => ({
			role: roles.find((r) => r.slug === roleSlug)?.name ?? roleSlug,
			jurisdiction: jurisdiction === "none" ? "" : jurisdiction,
			facilityType: facilityType === "none" ? "" : facilityType,
			dealType: isLapseDeal ? "Lapse" : "Standard",
			isLapseDeal,
			stateRequiresOigSam,
			facilityRequiresOigSam,
		}),
		[
			roleSlug,
			jurisdiction,
			facilityType,
			isLapseDeal,
			stateRequiresOigSam,
			facilityRequiresOigSam,
			roles,
		],
	);

	const { nodes: graphNodes, edges: graphEdges } = useMemo(
		() => buildGraph(result, context, enabledConditions),
		[result, context, enabledConditions],
	);

	const [nodes, setNodes, onNodesChange] = useNodesState(graphNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(graphEdges);

	// Sync when graph data changes
	useEffect(() => {
		setNodes(graphNodes);
		setEdges(graphEdges);
	}, [graphNodes, graphEdges, setNodes, setEdges]);

	// Narrative text
	const roleName = roles.find((r) => r.slug === roleSlug)?.name ?? roleSlug;

	return (
		<div className="flex flex-col gap-4">
			{/* Control panel */}
			<div className="rounded-lg border bg-card p-3">
				<div className="flex items-end gap-4 flex-wrap">
					<div className="flex flex-col gap-1.5 min-w-[160px]">
						<Label className="text-xs text-muted-foreground">Role</Label>
						<Select value={roleSlug} onValueChange={setRoleSlug}>
							<SelectTrigger className="h-8 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{roles.map((r) => (
									<SelectItem key={r.slug} value={r.slug}>
										{r.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-1.5 min-w-[160px]">
						<Label className="text-xs text-muted-foreground">State</Label>
						<Select value={jurisdiction} onValueChange={setJurisdiction}>
							<SelectTrigger className="h-8 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none" className="text-muted-foreground">
									None
								</SelectItem>
								{jurisdictions.map((j) => (
									<SelectItem key={j} value={j} className="capitalize">
										{j.replace(/-/g, " ")}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-1.5 min-w-[140px]">
						<Label className="text-xs text-muted-foreground">Facility</Label>
						<Select value={facilityType} onValueChange={setFacilityType}>
							<SelectTrigger className="h-8 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none" className="text-muted-foreground">
									None
								</SelectItem>
								{facilityTypes.map((f) => (
									<SelectItem key={f} value={f} className="capitalize">
										{f.replace(/-/g, " ")}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Conditions toggle */}
					<button
						type="button"
						onClick={() => setConditionsExpanded(!conditionsExpanded)}
						className={cn(
							"flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs transition-colors duration-150",
							activeConditionCount > 0
								? "border-negative/30 bg-negative-subtle text-negative"
								: "border-border bg-card text-muted-foreground hover:bg-muted/50",
						)}
					>
						<AlertTriangle className="h-3 w-3" />
						<span>Conditions</span>
						{activeConditionCount > 0 && (
							<Badge
								variant="secondary"
								className="text-[10px] px-1 py-0 h-3.5 min-w-[14px] bg-negative text-white"
							>
								{activeConditionCount}
							</Badge>
						)}
						{conditionsExpanded ? (
							<ChevronUp className="h-3 w-3 ml-0.5" />
						) : (
							<ChevronDown className="h-3 w-3 ml-0.5" />
						)}
					</button>
				</div>

				{/* Expandable conditions panel */}
				{conditionsExpanded && (
					<div className="mt-3 pt-3 border-t">
						<p className="text-[11px] text-muted-foreground mb-2.5">
							Enable conditions to trigger additional screening requirements.
							Each condition adds packages to the resolution when active.
						</p>
						<div className="flex flex-col gap-1.5">
							{PRE_DEFINED_CONDITIONS.map((cond) => {
								const isEnabled = enabledConditions.has(cond.id);
								const isExpanded = expandedConditionId === cond.id;

								return (
									<div
										key={cond.id}
										className={cn(
											"rounded-md border transition-colors duration-150",
											isEnabled
												? "border-negative/30 bg-negative-subtle"
												: "border-border",
										)}
									>
										<div className="flex items-center gap-2.5 px-3 py-2">
											<Checkbox
												id={`cond-${cond.id}`}
												checked={isEnabled}
												onCheckedChange={(checked) => {
													setEnabledConditions((prev) => {
														const next = new Set(prev);
														if (checked) next.add(cond.id);
														else next.delete(cond.id);
														return next;
													});
												}}
											/>
											<label
												htmlFor={`cond-${cond.id}`}
												className="flex-1 cursor-pointer"
											>
												<span className="text-xs font-medium block">
													{cond.name}
												</span>
												<span className="text-[10px] text-muted-foreground block mt-0.5">
													{cond.description}
												</span>
											</label>
											<button
												type="button"
												onClick={() =>
													setExpandedConditionId(isExpanded ? null : cond.id)
												}
												className="text-muted-foreground hover:text-foreground p-0.5 shrink-0"
											>
												{isExpanded ? (
													<ChevronDown className="h-3 w-3" />
												) : (
													<ChevronRight className="h-3 w-3" />
												)}
											</button>
										</div>

										{/* Expandable rule detail */}
										{isExpanded && (
											<div className="px-3 pb-2 pt-0">
												<div className="rounded bg-muted/50 px-2.5 py-1.5">
													{cond.rules.map((rule, i) => (
														<div
															key={i}
															className="flex items-center gap-1.5 text-[11px]"
														>
															<span className="text-muted-foreground">
																{i === 0 ? "If" : "and"}
															</span>
															<span className="font-medium">
																{rule.property}
															</span>
															<span className="text-muted-foreground">
																{rule.operator}
															</span>
															<Badge
																variant="outline"
																className="text-[10px] px-1.5 py-0 h-4"
															>
																{rule.value}
															</Badge>
														</div>
													))}
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Narrative callout */}
			{result && !loading && (
				<div className="rounded-lg border bg-warning-subtle px-4 py-2.5 text-sm">
					<span className="text-foreground">
						For a <strong>{roleName}</strong>
						{jurisdiction !== "none" && (
							<>
								{" "}
								in{" "}
								<strong className="capitalize">
									{jurisdiction.replace(/-/g, " ")}
								</strong>
							</>
						)}
						{facilityType !== "none" && (
							<>
								{" "}
								at a{" "}
								<strong className="capitalize">
									{facilityType.replace(/-/g, " ")}
								</strong>
							</>
						)}
						{activeConditionCount > 0
							? ` with ${activeConditionCount} condition${activeConditionCount > 1 ? "s" : ""} active`
							: ""}
						: the system composes{" "}
						<strong>{result.summary.total} requirements</strong> from{" "}
						<strong>
							{result.groups.length} package
							{result.groups.length !== 1 ? "s" : ""}
						</strong>{" "}
						automatically.
					</span>
				</div>
			)}

			{loading && <Skeleton className="h-10 rounded-lg" />}

			{/* React Flow canvas */}
			<div className="h-[500px] rounded-lg border bg-card overflow-hidden">
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					nodeTypes={nodeTypes}
					fitView
					fitViewOptions={{ padding: 0.3 }}
					minZoom={0.3}
					maxZoom={1.5}
					defaultEdgeOptions={{
						type: "smoothstep",
					}}
					proOptions={{ hideAttribution: true }}
				>
					<Background variant={BackgroundVariant.Dots} gap={20} size={1} />
					<Controls
						className="!bg-card !border-border !rounded-lg !shadow-md [&>button]:!bg-card [&>button]:!border-border [&>button]:!fill-foreground [&>button:hover]:!bg-muted"
						style={{ left: 10, bottom: 10 }}
					/>
				</ReactFlow>
			</div>
		</div>
	);
}
