/**
 * Hook to transform Drizzle schema into React Flow nodes and edges.
 *
 * Introspects Drizzle table definitions to extract:
 * - Table names and columns
 * - Column types and constraints
 * - Foreign key relationships
 */
import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import Dagre from "@dagrejs/dagre";
import * as schema from "@/lib/db/schema";
import { erdConfig, relationships, type DomainKey } from "./erd-config";

export interface ColumnInfo {
	name: string;
	type: string;
	isPrimaryKey: boolean;
	isForeignKey: boolean;
	isNullable: boolean;
	references?: {
		table: string;
		column: string;
	};
}

export interface TableInfo {
	name: string;
	columns: ColumnInfo[];
	domain: DomainKey;
}

export interface TableNodeData extends Record<string, unknown> {
	label: string;
	tableName: string;
	columns: ColumnInfo[];
	domain: DomainKey;
}

// Map Drizzle column types to display strings
function getColumnType(column: any): string {
	const dataType = column.dataType;
	if (dataType === "string") {
		if (column.columnType === "PgUUID") return "uuid";
		if (column.columnType === "PgVarchar") return "varchar";
		return "text";
	}
	if (dataType === "boolean") return "boolean";
	if (dataType === "number") return "integer";
	if (dataType === "date") return "timestamp";
	if (dataType === "json") return "jsonb";
	return dataType || "unknown";
}

// Build a set of FK columns from explicit relationships config
// Format: "tableName-columnName"
function buildFkColumnSet(): Set<string> {
	const fkColumns = new Set<string>();
	for (const rel of relationships) {
		fkColumns.add(`${rel.source}-${rel.sourceColumn}`);
	}
	return fkColumns;
}

const fkColumnSet = buildFkColumnSet();

// Extract column information from Drizzle table
function extractColumns(table: any, tableName: string): ColumnInfo[] {
	const columns: ColumnInfo[] = [];

	for (const [name, column] of Object.entries(table)) {
		if (!column || typeof column !== "object") continue;
		if (!("columnType" in column)) continue;

		const col = column as any;
		const isPrimaryKey = col.primary === true || col.primaryKey === true;
		const isNullable = col.notNull !== true;

		// Check if this column is an FK based on explicit relationships config
		const isForeignKey = fkColumnSet.has(`${tableName}-${name}`);

		columns.push({
			name,
			type: getColumnType(col),
			isPrimaryKey,
			isForeignKey,
			isNullable,
		});
	}

	return columns;
}

// Get table name from Drizzle table object
function getTableName(table: any): string {
	return (
		table[Symbol.for("drizzle:Name")] || table._.name || table.name || "unknown"
	);
}

// Find domain for a table based on config
function findDomain(tableName: string): DomainKey {
	for (const [domain, config] of Object.entries(erdConfig.domains)) {
		if (config.tables.includes(tableName)) {
			return domain as DomainKey;
		}
	}
	return "operations"; // Default fallback
}

// Check if a value is a Drizzle table object
function isDrizzleTable(value: unknown): boolean {
	if (!value || typeof value !== "object") return false;

	// Check for drizzle symbol key on the object
	const drizzleSymbol = Symbol.for("drizzle:Name");
	if (drizzleSymbol in value) return true;

	// Check for internal _ property with name (Drizzle table structure)
	if ("_" in value) {
		const internal = (value as any)._;
		if (internal && typeof internal === "object" && "name" in internal) {
			return true;
		}
	}

	return false;
}

// Extract all tables from schema
function extractTables(): TableInfo[] {
	const tables: TableInfo[] = [];
	const excludeTables = ["user", "chat", "message", "vote", "document", "suggestion", "stream", "voiceTemplate", "voiceCall"];

	for (const [key, value] of Object.entries(schema)) {
		// Only process Drizzle table objects
		if (!isDrizzleTable(value)) continue;

		// Skip non-table exports (types, etc)
		const tableName = getTableName(value);
		if (tableName === "unknown") continue;

		// Skip chat/voice tables - only show data model tables
		if (excludeTables.includes(key)) continue;

		const columns = extractColumns(value, tableName);
		if (columns.length === 0) continue;

		tables.push({
			name: tableName,
			columns,
			domain: findDomain(tableName),
		});
	}

	return tables;
}

// Generate edges from explicit relationship config
function generateEdges(tables: TableInfo[]): Edge[] {
	const edges: Edge[] = [];
	const tableNames = new Set(tables.map((t) => t.name));

	for (const rel of relationships) {
		// Only create edge if both tables exist
		if (!tableNames.has(rel.source) || !tableNames.has(rel.target)) continue;

		// Get domain color from source table
		const sourceTable = tables.find((t) => t.name === rel.source);
		const domainConfig = sourceTable
			? erdConfig.domains[sourceTable.domain]
			: undefined;

		// Handle IDs for column-level connections
		// Source: FK column on the source table
		// Target: PK (id) column on the target table
		const sourceHandle = `${rel.source}-${rel.sourceColumn}-source`;
		const targetHandle = `${rel.target}-id-target`;

		edges.push({
			id: `${rel.source}-${rel.sourceColumn}-${rel.target}`,
			source: rel.source,
			sourceHandle,
			target: rel.target,
			targetHandle,
			type: "smoothstep",
			animated: false,
			style: {
				stroke: domainConfig?.color || "#6b7280",
				strokeWidth: 1.5,
				opacity: 0.7,
			},
			markerEnd: {
				type: "arrowclosed" as const,
				color: domainConfig?.color || "#6b7280",
				width: 12,
				height: 12,
			},
		});
	}

	return edges;
}

// Generate nodes from tables
function generateNodes(tables: TableInfo[]): Node[] {
	return tables.map((table) => {
		const position = erdConfig.positions[table.name] || { x: 0, y: 0 };
		const domainConfig = erdConfig.domains[table.domain];

		return {
			id: table.name,
			type: "tableNode",
			position,
			data: {
				label: table.name,
				tableName: table.name,
				columns: table.columns,
				domain: table.domain,
			} satisfies TableNodeData,
			style: {
				borderColor: domainConfig?.color || "var(--border)",
			},
		};
	});
}

// Calculate bounding box for domain group nodes
function calculateDomainBounds(
	tables: TableInfo[],
): Record<string, { x: number; y: number; width: number; height: number }> {
	const bounds: Record<
		string,
		{ minX: number; minY: number; maxX: number; maxY: number }
	> = {};

	const nodeWidth = 240;
	const nodeHeight = 300; // Approximate height

	for (const table of tables) {
		const pos = erdConfig.positions[table.name];
		if (!pos) continue;

		if (!bounds[table.domain]) {
			bounds[table.domain] = {
				minX: pos.x,
				minY: pos.y,
				maxX: pos.x + nodeWidth,
				maxY: pos.y + nodeHeight,
			};
		} else {
			bounds[table.domain].minX = Math.min(bounds[table.domain].minX, pos.x);
			bounds[table.domain].minY = Math.min(bounds[table.domain].minY, pos.y);
			bounds[table.domain].maxX = Math.max(
				bounds[table.domain].maxX,
				pos.x + nodeWidth,
			);
			bounds[table.domain].maxY = Math.max(
				bounds[table.domain].maxY,
				pos.y + nodeHeight,
			);
		}
	}

	const result: Record<
		string,
		{ x: number; y: number; width: number; height: number }
	> = {};
	const padding = 30;

	for (const [domain, b] of Object.entries(bounds)) {
		result[domain] = {
			x: b.minX - padding,
			y: b.minY - padding,
			width: b.maxX - b.minX + padding * 2,
			height: b.maxY - b.minY + padding * 2,
		};
	}

	return result;
}

// Generate domain group nodes
function generateDomainGroups(tables: TableInfo[]): Node[] {
	const bounds = calculateDomainBounds(tables);
	const groups: Node[] = [];

	for (const [domain, rect] of Object.entries(bounds)) {
		const config = erdConfig.domains[domain as DomainKey];
		if (!config) continue;

		groups.push({
			id: `group-${domain}`,
			type: "domainGroup",
			position: { x: rect.x, y: rect.y },
			data: {
				label: config.label,
				color: config.color,
				bgColor: config.bgColor,
			},
			style: {
				width: rect.width,
				height: rect.height,
				zIndex: -1,
			},
			selectable: false,
			draggable: false,
		});
	}

	return groups;
}

// Apply dagre layout to nodes
function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
	const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

	g.setGraph({
		rankdir: "LR", // Left to right
		nodesep: 80, // Horizontal spacing
		ranksep: 120, // Vertical spacing between ranks
		marginx: 50,
		marginy: 50,
	});

	// Add nodes to dagre graph
	for (const node of nodes) {
		// Skip group nodes
		if (node.type === "domainGroup") continue;

		g.setNode(node.id, {
			width: 240,
			height: 350, // Approximate height based on columns
		});
	}

	// Add edges to dagre graph
	for (const edge of edges) {
		g.setEdge(edge.source, edge.target);
	}

	// Run the layout
	Dagre.layout(g);

	// Apply positions back to nodes
	return nodes.map((node) => {
		if (node.type === "domainGroup") return node;

		const dagreNode = g.node(node.id);
		if (!dagreNode) return node;

		return {
			...node,
			position: {
				x: dagreNode.x - 120, // Center the node
				y: dagreNode.y - 175,
			},
		};
	});
}

export function useSchemaToErd() {
	return useMemo(() => {
		const tables = extractTables();
		const tableNodes = generateNodes(tables);
		const edges = generateEdges(tables);

		// Apply dagre auto-layout
		const layoutedNodes = applyDagreLayout(tableNodes, edges);

		// Generate domain groups after layout (so they wrap correctly)
		// Skip groups for now since layout changes positions
		// const groupNodes = generateDomainGroups(tables);

		return { nodes: layoutedNodes, edges, tables };
	}, []);
}
