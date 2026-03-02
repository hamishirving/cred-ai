"use client";
import { Response } from "@/components/elements/response";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	XAxis,
	YAxis,
} from "recharts";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

type DataRow = Record<string, unknown>;
type DataSchemaField = {
	name?: string;
	type?: string;
	mode?: string;
};

type DataAgentNormalizedOutput = {
	summary: string;
	sql?: string;
	result?: {
		name?: string;
		data?: DataRow[];
		schema?: {
			fields?: DataSchemaField[];
		};
	};
	chart?: unknown;
	metadata?: {
		elapsedMs?: number;
		eventCount?: number;
		jobId?: string;
	};
};

interface DataAgentOutput {
	data?: unknown;
	error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDataAgentOutput(data: unknown): DataAgentNormalizedOutput | null {
	if (!isRecord(data)) return null;

	// Current normalized format
	if (typeof data.summary === "string") {
		return data as unknown as DataAgentNormalizedOutput;
	}

	// Backward compatibility for older format: { text, sql, data }
	if (typeof data.text === "string") {
		return {
			summary: data.text,
			sql: typeof data.sql === "string" ? data.sql : undefined,
			result: isRecord(data.data)
				? (data.data as DataAgentNormalizedOutput["result"])
				: undefined,
		};
	}

	return null;
}

function toDisplayValue(value: unknown): string {
	if (value === null || value === undefined) return "—";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean") return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

type VegaEncodingChannel = {
	field?: string;
	type?: string;
	title?: string;
};

type VegaLikeSpec = {
	title?: string;
	mark?: string | { type?: string };
	encoding?: {
		x?: VegaEncodingChannel;
		y?: VegaEncodingChannel;
		theta?: VegaEncodingChannel;
		color?: VegaEncodingChannel;
	};
};

const CHART_COLOURS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

function isRecordArray(value: unknown): value is DataRow[] {
	return (
		Array.isArray(value) &&
		value.every((row) => typeof row === "object" && row !== null)
	);
}

function getChartSpec(chart: unknown): VegaLikeSpec | null {
	if (!isRecord(chart)) return null;

	if (isRecord(chart.vegaConfig)) {
		return chart.vegaConfig as VegaLikeSpec;
	}
	if (isRecord(chart.spec)) {
		return chart.spec as VegaLikeSpec;
	}
	if (isRecord(chart.encoding) || typeof chart.mark === "string" || isRecord(chart.mark)) {
		return chart as VegaLikeSpec;
	}
	return null;
}

function getChartRows(chart: unknown, fallbackRows: DataRow[]): DataRow[] {
	if (isRecord(chart)) {
		if (isRecordArray(chart.data)) return chart.data;
		if (isRecordArray(chart.vegaData)) return chart.vegaData;
		if (isRecord(chart.result) && isRecordArray(chart.result.data)) {
			return chart.result.data;
		}
	}
	return fallbackRows;
}

function getMarkType(spec: VegaLikeSpec): string {
	const mark = spec.mark;
	if (typeof mark === "string") return mark.toLowerCase();
	if (isRecord(mark) && typeof mark.type === "string") {
		return mark.type.toLowerCase();
	}
	return "bar";
}

function extractField(channel: VegaEncodingChannel | undefined): string | undefined {
	return channel?.field;
}

function hasAnyFieldValue(rows: DataRow[], field: string | undefined): boolean {
	if (!field || rows.length === 0) return false;
	return rows.some((row) => row[field] !== undefined && row[field] !== null);
}

function isNumericField(rows: DataRow[], field: string | undefined): boolean {
	if (!field || rows.length === 0) return false;
	return rows.some((row) => typeof row[field] === "number");
}

function isStringField(rows: DataRow[], field: string | undefined): boolean {
	if (!field || rows.length === 0) return false;
	return rows.some((row) => typeof row[field] === "string");
}

function detectNumericField(rows: DataRow[]): string | undefined {
	if (rows.length === 0) return undefined;
	const keys = Object.keys(rows[0]);
	return keys.find((key) =>
		rows.some((row) => typeof row[key] === "number"),
	);
}

function detectLabelField(rows: DataRow[], avoid?: string): string | undefined {
	if (rows.length === 0) return undefined;
	const keys = Object.keys(rows[0]);
	return keys.find(
		(key) => key !== avoid && isStringField(rows, key),
	);
}

function resolveNumericField(
	rows: DataRow[],
	preferred: string | undefined,
	fallback?: string,
): string | undefined {
	if (isNumericField(rows, preferred)) return preferred;
	if (isNumericField(rows, fallback)) return fallback;
	return detectNumericField(rows);
}

function resolveLabelField(
	rows: DataRow[],
	preferred: string | undefined,
	avoid?: string,
	fallback?: string,
): string | undefined {
	if (isStringField(rows, preferred)) return preferred;
	if (isStringField(rows, fallback)) return fallback;
	return detectLabelField(rows, avoid);
}

function buildChartConfig(fields: Array<string | undefined>) {
	return fields
		.filter((f): f is string => !!f)
		.reduce<Record<string, { label: string; color?: string }>>(
			(acc, field, idx) => {
				acc[field] = {
					label: field.replace(/_/g, " "),
					color: CHART_COLOURS[idx % CHART_COLOURS.length],
				};
				return acc;
			},
			{},
		);
}

function DataAgentChart({
	chart,
	rows,
}: {
	chart: unknown;
	rows: DataRow[];
}) {
	const spec = getChartSpec(chart);
	if (!spec) return null;

	const chartRows = getChartRows(chart, rows);
	if (chartRows.length === 0) return null;

	const markType = getMarkType(spec);
	const title = spec.title;

	const specXField = extractField(spec.encoding?.x);
	const specYField = extractField(spec.encoding?.y);
	const specThetaField = extractField(spec.encoding?.theta);
	const specColorField = extractField(spec.encoding?.color);

	const yField = resolveNumericField(chartRows, specYField);
	const xField = resolveLabelField(chartRows, specXField, yField, specColorField);
	const thetaField = resolveNumericField(chartRows, specThetaField, specYField);
	const colorField = resolveLabelField(
		chartRows,
		specColorField,
		thetaField,
		specXField,
	);

	if ((markType === "arc" || markType === "pie") && thetaField) {
		const config = buildChartConfig([thetaField, colorField]);
		const legendEntries = colorField
			? Array.from(
					new Map(
						chartRows.map((row, index) => [
							String(row[colorField] ?? "—"),
							CHART_COLOURS[index % CHART_COLOURS.length],
						]),
					),
				).map(([label, color]) => ({ label, color }))
			: [];
		const colourByCategory = new Map(
			legendEntries.map((entry) => [entry.label, entry.color]),
		);
		return (
			<div className="space-y-2">
				{title && <div className="text-xs font-medium text-muted-foreground">{title}</div>}
				<ChartContainer config={config} className="h-[280px] w-full aspect-auto">
					<PieChart>
						<ChartTooltip content={<ChartTooltipContent />} />
						<Pie data={chartRows} dataKey={thetaField} nameKey={colorField}>
							{chartRows.map((_, index) => (
								// Keep colour stable by category label when available.
								<Cell
									key={`slice-${index}`}
									fill={
										colorField
											? (colourByCategory.get(
													String(chartRows[index][colorField] ?? "—"),
												) ?? CHART_COLOURS[index % CHART_COLOURS.length])
											: CHART_COLOURS[index % CHART_COLOURS.length]
									}
								/>
							))}
						</Pie>
					</PieChart>
				</ChartContainer>
				{legendEntries.length > 0 && (
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-1 text-xs">
						{legendEntries.map((entry) => (
							<div key={entry.label} className="flex items-center gap-1.5">
								<span
									className="inline-block h-2 w-2 rounded-[2px]"
									style={{ backgroundColor: entry.color }}
								/>
								<span className="text-muted-foreground">{entry.label}</span>
							</div>
						))}
					</div>
				)}
			</div>
		);
	}

	if (markType === "line" && xField && yField) {
		const config = buildChartConfig([xField, yField]);
		return (
			<div className="space-y-2">
				{title && <div className="text-xs font-medium text-muted-foreground">{title}</div>}
				<ChartContainer config={config} className="h-[280px] w-full aspect-auto">
					<LineChart data={chartRows}>
						<CartesianGrid vertical={false} />
						<XAxis dataKey={xField} tickLine={false} axisLine={false} />
						<YAxis tickLine={false} axisLine={false} />
						<ChartTooltip content={<ChartTooltipContent />} />
						<Line
							type="monotone"
							dataKey={yField}
							stroke="var(--chart-1)"
							strokeWidth={2}
							dot={false}
						/>
					</LineChart>
				</ChartContainer>
			</div>
		);
	}

	if (markType === "area" && xField && yField) {
		const config = buildChartConfig([xField, yField]);
		return (
			<div className="space-y-2">
				{title && <div className="text-xs font-medium text-muted-foreground">{title}</div>}
				<ChartContainer config={config} className="h-[280px] w-full aspect-auto">
					<AreaChart data={chartRows}>
						<CartesianGrid vertical={false} />
						<XAxis dataKey={xField} tickLine={false} axisLine={false} />
						<YAxis tickLine={false} axisLine={false} />
						<ChartTooltip content={<ChartTooltipContent />} />
						<Area
							type="monotone"
							dataKey={yField}
							stroke="var(--chart-1)"
							fill="var(--chart-1)"
							fillOpacity={0.2}
						/>
					</AreaChart>
				</ChartContainer>
			</div>
		);
	}

	if (xField && yField) {
		const config = buildChartConfig([xField, yField]);
		return (
			<div className="space-y-2">
				{title && <div className="text-xs font-medium text-muted-foreground">{title}</div>}
				<ChartContainer config={config} className="h-[280px] w-full aspect-auto">
					<BarChart data={chartRows}>
						<CartesianGrid vertical={false} />
						<XAxis dataKey={xField} tickLine={false} axisLine={false} />
						<YAxis tickLine={false} axisLine={false} />
						<ChartTooltip content={<ChartTooltipContent />} />
						<Bar dataKey={yField} fill="var(--chart-1)" radius={4} />
					</BarChart>
				</ChartContainer>
			</div>
		);
	}

	return null;
}

export function DataAgentTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, DataAgentOutput>) {
	// Show loading state while running
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
		return (
			<div className="text-destructive text-sm">
				Error: {String(output.error)}
			</div>
		);
	}

	if (!output.data) {
		return null;
	}

	if (typeof output.data === "string") {
		return null;
	}

	const normalized = normalizeDataAgentOutput(output.data);
	if (!normalized) {
		return (
			<div className="rounded-lg border bg-card p-3">
				<pre className="overflow-auto text-xs">
					{JSON.stringify(output.data, null, 2)}
				</pre>
			</div>
		);
	}

	const rows = Array.isArray(normalized.result?.data)
		? normalized.result?.data
		: [];
	const fields =
		normalized.result?.schema?.fields?.filter(
			(field): field is DataSchemaField => typeof field?.name === "string",
		) || [];
	const columnNames =
		fields.length > 0
			? fields.map((field) => field.name as string)
			: rows.length > 0
				? Object.keys(rows[0])
				: [];
	const previewRows = rows.slice(0, 20);
	const hasChart = normalized.chart !== undefined && normalized.chart !== null;
	const summary = normalized.summary?.trim();
	const hasSummary = !!summary && summary !== "Query completed successfully.";
	const chartNode = hasChart ? (
		<DataAgentChart chart={normalized.chart} rows={rows} />
	) : null;

	return (
		<div className="space-y-2">
			{hasSummary && (
				<div className="prose prose-sm dark:prose-invert max-w-none">
					<Response>{summary}</Response>
				</div>
			)}

			<div className="not-prose my-3 rounded-lg border bg-card text-card-foreground">
				{rows.length > 0 && columnNames.length > 0 && (
					<div className="space-y-2 p-3 border-b">
						<div className="text-xs text-muted-foreground">
							{rows.length} row{rows.length === 1 ? "" : "s"}
							{normalized.result?.name ? ` from ${normalized.result.name}` : ""}
						</div>
						<div className="overflow-x-auto rounded border">
							<table className="min-w-full text-xs">
								<thead className="bg-muted/40">
									<tr>
										{columnNames.map((column) => (
											<th
												key={column}
												className="border-b px-2 py-1.5 text-left font-medium"
											>
												{column}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{previewRows.map((row, rowIndex) => (
										<tr key={rowIndex} className="border-b last:border-b-0">
											{columnNames.map((column) => (
												<td
													key={`${rowIndex}-${column}`}
													className="px-2 py-1.5 align-top"
												>
													{toDisplayValue(row[column])}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{rows.length > previewRows.length && (
							<p className="text-xs text-muted-foreground">
								Showing first {previewRows.length} rows.
							</p>
						)}
					</div>
				)}

				{hasChart && (
					<div className="border-b p-3">
						<div className="text-xs font-medium text-muted-foreground mb-2">
							Chart
						</div>
						{chartNode ? (
							chartNode
						) : (
							<pre className="overflow-auto rounded bg-muted/40 p-2 text-xs">
								{JSON.stringify(normalized.chart, null, 2)}
							</pre>
						)}
					</div>
				)}

				{rows.length === 0 && !hasChart && (
					<div className="p-3 text-xs text-muted-foreground">
						No tabular result returned.
					</div>
				)}

				{normalized.sql && (
					<details className="p-3">
						<summary className="cursor-pointer text-xs font-medium text-muted-foreground">
							Show generated SQL
						</summary>
						<pre className="mt-2 overflow-auto rounded bg-muted/40 p-2 text-xs">
							{normalized.sql}
						</pre>
					</details>
				)}

			</div>
		</div>
	);
}
