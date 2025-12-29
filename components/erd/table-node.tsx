"use client";

import { memo } from "react";
import { Handle, Position, type Node } from "@xyflow/react";
import { KeyRound, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { erdConfig } from "./erd-config";
import { EntityTooltip } from "./entity-tooltip";
import type { TableNodeData, ColumnInfo } from "./use-schema-to-erd";

export type TableNodeType = Node<TableNodeData, "tableNode">;

function ColumnRow({ column }: { column: ColumnInfo }) {
	return (
		<div className="flex items-center justify-between px-3 py-1 text-xs border-b border-border/50 last:border-b-0 hover:bg-muted/50">
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
		</div>
	);
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
			{/* Left handle - target for incoming relationships */}
			<Handle
				type="target"
				position={Position.Left}
				className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
			/>

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

			{/* Columns */}
			<div className="bg-card">
				{data.columns.map((column) => (
					<ColumnRow key={column.name} column={column} />
				))}
			</div>

			{/* Right handle - source for outgoing relationships */}
			<Handle
				type="source"
				position={Position.Right}
				className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
			/>
		</div>
	);
}

export const TableNode = memo(TableNodeComponent);
