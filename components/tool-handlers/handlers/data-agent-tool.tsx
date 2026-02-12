"use client";

import { useMemo } from "react";
import {
	ResponsiveContainer,
	BarChart,
	Bar,
	LineChart,
	Line,
	PieChart,
	Pie,
	Cell,
	Legend,
	CartesianGrid,
	XAxis,
	YAxis,
	Tooltip as RechartsTooltip,
} from "recharts";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface DataAgentOutput {
	data?: unknown;
	error?: string;
}

interface QueryResultSchemaField {
	name: string;
	type?: string;
	mode?: string;
}

interface QueryResultData {
	data?: Record<string, unknown>[];
	name?: string;
	schema?: {
		fields?: QueryResultSchemaField[];
	};
}

interface DataAgentPayload {
	text?: string;
	sql?: string;
	data?: QueryResultData | unknown;
	chart?: unknown;
}

type SupportedChartType = "pie" | "bar" | "line";

interface DataAgentChartPayload {
	type?: SupportedChartType;
	title?: string;
	dataResultName?: string;
	instructions?: string;
	vegaConfig?: unknown;
	data?: Record<string, unknown>[];
	xField?: string;
	yField?: string;
	categoryField?: string;
	valueField?: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function coercePayload(value: unknown): DataAgentPayload | null {
	if (!isPlainObject(value)) {
		return null;
	}

	return {
		text: typeof value.text === "string" ? value.text : undefined,
		sql: typeof value.sql === "string" ? value.sql : undefined,
		data: value.data,
		chart: value.chart,
	};
}

function coerceChart(value: unknown): DataAgentChartPayload | null {
	if (!isPlainObject(value)) {
		return null;
	}

	const rawType = value.type;
	const type: SupportedChartType | undefined =
		rawType === "pie" || rawType === "bar" || rawType === "line"
			? rawType
			: undefined;

	const data = Array.isArray(value.data)
		? value.data.filter((row): row is Record<string, unknown> =>
				isPlainObject(row),
			)
		: undefined;

	return {
		type,
		title: typeof value.title === "string" ? value.title : undefined,
		dataResultName:
			typeof value.dataResultName === "string" ? value.dataResultName : undefined,
		instructions:
			typeof value.instructions === "string" ? value.instructions : undefined,
		vegaConfig: value.vegaConfig,
		data,
		xField: typeof value.xField === "string" ? value.xField : undefined,
		yField: typeof value.yField === "string" ? value.yField : undefined,
		categoryField:
			typeof value.categoryField === "string" ? value.categoryField : undefined,
		valueField: typeof value.valueField === "string" ? value.valueField : undefined,
	};
}

function getRows(resultData: DataAgentPayload["data"]): Record<string, unknown>[] {
	if (!resultData) {
		return [];
	}

	if (isPlainObject(resultData) && Array.isArray(resultData.data)) {
		return resultData.data.filter((row): row is Record<string, unknown> =>
			isPlainObject(row),
		);
	}

	if (Array.isArray(resultData)) {
		return resultData.filter((row): row is Record<string, unknown> =>
			isPlainObject(row),
		);
	}

	return [];
}

function getSchemaFields(
	resultData: DataAgentPayload["data"],
	rows: Record<string, unknown>[],
): QueryResultSchemaField[] {
	if (isPlainObject(resultData)) {
		const schema = resultData.schema;
		const fields =
			isPlainObject(schema) && Array.isArray(schema.fields)
				? (schema.fields as QueryResultSchemaField[])
				: undefined;
		if (Array.isArray(fields) && fields.length > 0) {
			return fields;
		}
	}

	if (rows.length === 0) {
		return [];
	}

	return Object.keys(rows[0]).map((name) => ({ name }));
}

function formatCell(value: unknown): string {
	if (value === null || value === undefined) {
		return "—";
	}
	if (typeof value === "string") {
		return value.trim() === "" ? "—" : value;
	}
	return String(value);
}

function isNumeric(value: unknown): boolean {
	if (typeof value === "number") {
		return Number.isFinite(value);
	}
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		return Number.isFinite(parsed);
	}
	return false;
}

function toNumber(value: unknown): number | null {
	if (!isNumeric(value)) return null;
	return typeof value === "number" ? value : Number(value);
}

function isDateLike(value: unknown): boolean {
	if (typeof value !== "string") {
		return false;
	}
	const parsed = Date.parse(value);
	return Number.isFinite(parsed);
}

function inferChartKeys(
	fields: QueryResultSchemaField[],
	rows: Record<string, unknown>[],
): { xKey: string; yKey: string } | null {
	if (rows.length === 0) {
		return null;
	}

	const names = fields.map((f) => f.name);
	const numericCandidates = names.filter((name) => {
		const schemaType = fields.find((f) => f.name === name)?.type?.toUpperCase();
		if (schemaType && ["INTEGER", "INT64", "FLOAT", "NUMERIC", "BIGNUMERIC"].includes(schemaType)) {
			return true;
		}
		return rows.some((row) => isNumeric(row[name]));
	});

	if (numericCandidates.length === 0) {
		return null;
	}

	const yKey = numericCandidates[0];
	const dimensionCandidates = names.filter((name) => name !== yKey);
	if (dimensionCandidates.length === 0) {
		return null;
	}

	const dateKey = dimensionCandidates.find((name) => {
		const schemaType = fields.find((f) => f.name === name)?.type?.toUpperCase();
		if (schemaType && ["DATE", "DATETIME", "TIMESTAMP"].includes(schemaType)) {
			return true;
		}
		return rows.some((row) => isDateLike(row[name]));
	});

	const xKey = dateKey ?? dimensionCandidates[0];
	return { xKey, yKey };
}

const PIE_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
	"var(--primary)",
];

export function DataAgentTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, DataAgentOutput>) {
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Query Data"
				state={state}
				input={input}
			/>
		);
	}

	if (output.error) {
		return <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm">{output.error}</div>;
	}

	const payload = coercePayload(output.data);
	if (!payload) {
		return (
			<div className="rounded-md border bg-card p-3">
				<pre className="overflow-auto text-sm">{JSON.stringify(output.data, null, 2)}</pre>
			</div>
		);
	}

	const rows = getRows(payload.data);
	const fields = getSchemaFields(payload.data, rows);
	const chartPayload = coerceChart(payload.chart);
	const fallbackKeys = useMemo(() => inferChartKeys(fields, rows), [fields, rows]);

	const effectiveChartType: SupportedChartType | null =
		chartPayload?.type ??
		(fallbackKeys ? "bar" : null);

	const baseChartRows = chartPayload?.data && chartPayload.data.length > 0
		? chartPayload.data
		: rows;

	const xyKeys = useMemo(() => {
		if (chartPayload?.xField && chartPayload?.yField) {
			return { xKey: chartPayload.xField, yKey: chartPayload.yField };
		}
		return fallbackKeys;
	}, [chartPayload?.xField, chartPayload?.yField, fallbackKeys]);

	const seriesData = useMemo(() => {
		if (!xyKeys) return [];
		return baseChartRows
			.map((row) => {
				const y = toNumber(row[xyKeys.yKey]);
				if (y === null) return null;
				return {
					x: formatCell(row[xyKeys.xKey]),
					y,
				};
			})
			.filter((item): item is { x: string; y: number } => item !== null);
	}, [baseChartRows, xyKeys]);

	const pieKeys = useMemo(() => {
		const nameKey = chartPayload?.categoryField ?? (xyKeys ? xyKeys.xKey : null);
		const valueKey = chartPayload?.valueField ?? (xyKeys ? xyKeys.yKey : null);
		if (!nameKey || !valueKey) {
			return null;
		}
		return { nameKey, valueKey };
	}, [chartPayload?.categoryField, chartPayload?.valueField, xyKeys]);

	const pieData = useMemo(() => {
		if (!pieKeys) return [];
		return baseChartRows
			.map((row) => {
				const value = toNumber(row[pieKeys.valueKey]);
				if (value === null) return null;
				return {
					name: formatCell(row[pieKeys.nameKey]),
					value,
				};
			})
			.filter((item): item is { name: string; value: number } => item !== null);
	}, [baseChartRows, pieKeys]);

	const hasRenderableChart =
		(effectiveChartType === "pie" && pieData.length > 0) ||
		((effectiveChartType === "bar" || effectiveChartType === "line") &&
			seriesData.length > 0);

	const hasTable = rows.length > 0 && fields.length > 0;

	return (
		<div className="w-[650px] max-w-full space-y-3">
			{hasRenderableChart && (
				<div className="rounded-md border bg-background p-3">
					<p className="mb-2 text-muted-foreground text-xs">
						{chartPayload?.title ??
							(seriesData.length > 1 && xyKeys
								? `${xyKeys.yKey} by ${xyKeys.xKey}`
								: pieKeys
									? `${pieKeys.valueKey} by ${pieKeys.nameKey}`
									: "Chart")}
					</p>
					<div className="h-56 w-full">
						{effectiveChartType === "pie" ? (
							<ResponsiveContainer width="100%" height="100%">
								<PieChart>
									<Pie
										data={pieData}
										dataKey="value"
										nameKey="name"
										cx="50%"
										cy="50%"
										outerRadius={90}
										label
									>
										{pieData.map((_, index) => (
											<Cell
												key={`slice-${index}`}
												fill={PIE_COLORS[index % PIE_COLORS.length]}
											/>
										))}
									</Pie>
									<RechartsTooltip />
									<Legend />
								</PieChart>
							</ResponsiveContainer>
						) : effectiveChartType === "line" ? (
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={seriesData}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="x" tick={{ fontSize: 11 }} />
									<YAxis tick={{ fontSize: 11 }} />
									<RechartsTooltip />
									<Line
										type="monotone"
										dataKey="y"
										stroke="var(--primary)"
										strokeWidth={2}
										dot={{ r: 3 }}
									/>
								</LineChart>
							</ResponsiveContainer>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={seriesData}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="x" tick={{ fontSize: 11 }} />
									<YAxis tick={{ fontSize: 11 }} />
									<RechartsTooltip />
									<Bar dataKey="y" fill="var(--primary)" radius={[4, 4, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>
				</div>
			)}

			{hasTable && (
				<div className="overflow-hidden rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								{fields.map((field) => (
									<TableHead key={field.name}>{field.name}</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map((row, rowIndex) => (
								<TableRow key={rowIndex}>
									{fields.map((field) => (
										<TableCell key={`${rowIndex}-${field.name}`}>
											{formatCell(row[field.name])}
										</TableCell>
									))}
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{payload.sql && (hasRenderableChart || hasTable) && (
				<details className="rounded-md border bg-background p-3">
					<summary className="cursor-pointer text-muted-foreground text-xs font-medium">
						Generated SQL
					</summary>
					<pre className="mt-2 overflow-auto text-xs">{payload.sql}</pre>
				</details>
			)}

			{!hasRenderableChart && !hasTable && payload.text && (
				<p className="text-sm leading-relaxed">{payload.text}</p>
			)}
		</div>
	);
}
