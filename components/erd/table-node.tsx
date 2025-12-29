"use client";

import { memo } from "react";
import { Handle, Position, type Node } from "@xyflow/react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { KeyRound, Link2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { erdConfig, getRelationshipInfo } from "./erd-config";
import { EntityTooltip } from "./entity-tooltip";
import type { TableNodeData, ColumnInfo } from "./use-schema-to-erd";

export type TableNodeType = Node<TableNodeData, "tableNode">;

function ColumnRow({
	column,
	tableName,
}: {
	column: ColumnInfo;
	tableName: string;
}) {
	const relationshipInfo = column.isForeignKey
		? getRelationshipInfo(tableName, column.name)
		: undefined;

	const columnContent = (
		<div className="relative flex items-center justify-between px-3 py-1 text-xs border-b border-border/50 last:border-b-0 hover:bg-muted/50">
			{/* Left handle - target for incoming edges (PK columns) */}
			{column.isPrimaryKey && (
				<Handle
					type="target"
					position={Position.Left}
					id={`${tableName}-${column.name}-target`}
					className="!w-2 !h-2 !bg-amber-500 !border !border-background !left-0"
				/>
			)}

			<div className="flex items-center gap-1.5">
				{column.isPrimaryKey && (
					<KeyRound className="h-3 w-3 text-amber-500" />
				)}
				{column.isForeignKey && !column.isPrimaryKey && (
					<Link2 className="h-3 w-3 text-blue-500" />
				)}
				<span
					className={cn(
						"font-mono",
						column.isPrimaryKey && "font-semibold",
						column.isForeignKey && "text-blue-600 dark:text-blue-400",
					)}
				>
					{column.name}
				</span>
			</div>
			<div className="flex items-center gap-1 text-muted-foreground">
				<span className="font-mono text-[10px]">{column.type}</span>
				{column.isNullable && <span className="text-[10px]">?</span>}
			</div>

			{/* Right handle - source for outgoing edges (FK columns) */}
			{column.isForeignKey && (
				<Handle
					type="source"
					position={Position.Right}
					id={`${tableName}-${column.name}-source`}
					className="!w-2 !h-2 !bg-blue-500 !border !border-background !right-0"
				/>
			)}
		</div>
	);

	// Wrap FK columns in tooltip
	if (relationshipInfo) {
		return (
			<TooltipPrimitive.Provider delayDuration={200}>
				<TooltipPrimitive.Root>
					<TooltipPrimitive.Trigger asChild>
						<div className="cursor-help">{columnContent}</div>
					</TooltipPrimitive.Trigger>
					<TooltipPrimitive.Portal>
						<TooltipPrimitive.Content
							side="left"
							sideOffset={8}
							className="max-w-64 p-2 rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 z-50"
						>
							<div className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 flex-wrap">
								<span className="font-mono break-all">{column.name}</span>
								<ArrowRight className="h-3 w-3 shrink-0" />
								<span className="font-mono break-all">{relationshipInfo.target}.id</span>
							</div>
							{relationshipInfo.description && (
								<p className="mt-1.5 text-xs text-muted-foreground">
									{relationshipInfo.description}
								</p>
							)}
						</TooltipPrimitive.Content>
					</TooltipPrimitive.Portal>
				</TooltipPrimitive.Root>
			</TooltipPrimitive.Provider>
		);
	}

	return columnContent;
}

interface TableNodeProps {
	data: TableNodeData;
}

function TableNodeComponent({ data }: TableNodeProps) {
	const domainConfig = erdConfig.domains[data.domain];

	return (
		<div
			className="min-w-[220px] rounded-lg border-2 bg-card shadow-md overflow-hidden"
			style={{ borderColor: domainConfig?.color || "var(--border)" }}
		>
			{/* Header with tooltip */}
			<EntityTooltip tableName={data.tableName} domain={data.domain}>
				<div
					className="px-3 py-2 font-semibold text-sm flex items-center gap-2 cursor-help"
					style={{ backgroundColor: domainConfig?.bgColor || "var(--muted)" }}
				>
					<span className="text-base">🗃️</span>
					<span className="font-mono">{data.tableName}</span>
				</div>
			</EntityTooltip>

			{/* Columns - each FK/PK column has its own handle */}
			<div className="bg-card">
				{data.columns.map((column) => (
					<ColumnRow
						key={column.name}
						column={column}
						tableName={data.tableName}
					/>
				))}
			</div>
		</div>
	);
}

export const TableNode = memo(TableNodeComponent);
