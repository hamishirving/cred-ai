"use client";

import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, Phone, Clock, MessageSquare } from "lucide-react";

interface CallData {
	status?: string;
	outcome?: string;
	duration?: number;
	capturedData?: Record<string, unknown>;
	transcript?: string;
	pollCount?: number;
	timedOut?: boolean;
}

interface CallResultsDisplayProps {
	data: Record<string, unknown>;
	originalContext?: Record<string, string>;
}

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	if (mins === 0) return `${secs}s`;
	return `${mins}m ${secs}s`;
}

function formatMonthYear(value: string): string {
	if (!value || value === "-") return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function normalise(str: string): string {
	return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toYearMonth(dateString: string): string {
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return dateString;
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function valuesMatch(field: string, original: string, confirmed: string): boolean {
	if (!original || !confirmed || original === "-" || confirmed === "-") return false;
	if (field.toLowerCase().includes("date")) {
		return toYearMonth(original) === toYearMonth(confirmed);
	}
	const a = normalise(original);
	const b = normalise(confirmed);
	return a.includes(b) || b.includes(a);
}

function parseTranscript(transcript: string) {
	const lines = transcript.split("\n");
	const messages: { speaker: string; text: string }[] = [];
	let currentSpeaker = "";
	let currentText = "";

	for (const line of lines) {
		if (line.startsWith("AI:") || line.startsWith("User:")) {
			if (currentSpeaker && currentText) {
				messages.push({ speaker: currentSpeaker, text: currentText.trim() });
			}
			const [speaker, ...rest] = line.split(":");
			currentSpeaker = speaker;
			currentText = rest.join(":").trim();
		} else if (line.trim()) {
			currentText += " " + line.trim();
		}
	}

	if (currentSpeaker && currentText) {
		messages.push({ speaker: currentSpeaker, text: currentText.trim() });
	}

	return messages;
}

/** Extract confirmed results from VAPI structured outputs */
function extractConfirmedData(capturedData: Record<string, unknown>): Record<string, unknown> {
	// capturedData might be the structured outputs directly, or nested
	const firstKey = Object.keys(capturedData)[0];
	const firstVal = capturedData[firstKey];

	// Check if it's { name: "...", result: { ... } } format
	if (firstVal && typeof firstVal === "object" && "result" in (firstVal as Record<string, unknown>)) {
		return (firstVal as { result: Record<string, unknown> }).result;
	}

	// Otherwise use capturedData directly (flat confirmed_* keys)
	return capturedData;
}

const FIELD_MAP: { field: string; confirmedKey: string; originalKey: string; isDate?: boolean }[] = [
	{ field: "Job Title", confirmedKey: "confirmed_jobTitle", originalKey: "candidateJobTitle" },
	{ field: "Company", confirmedKey: "confirmed_companyName", originalKey: "companyName" },
	{ field: "Start Date", confirmedKey: "confirmed_startDate", originalKey: "startDate", isDate: true },
	{ field: "End Date", confirmedKey: "confirmed_endDate", originalKey: "endDate", isDate: true },
	{ field: "Employment Type", confirmedKey: "confirmed_employmentType", originalKey: "employmentType" },
	{ field: "Reason for Leaving", confirmedKey: "confirmed_reasonForLeaving", originalKey: "" },
	{ field: "Eligible for Rehire", confirmedKey: "eligible_for_rehire", originalKey: "" },
	{ field: "Would Recommend", confirmedKey: "would_recommend", originalKey: "" },
];

function formatValue(value: unknown): string {
	if (value === undefined || value === null) return "-";
	if (typeof value === "string") return value.replace(/_/g, " ");
	if (typeof value === "boolean") return value ? "Yes" : "No";
	return String(value);
}

export function CallResultsDisplay({ data, originalContext }: CallResultsDisplayProps) {
	const call = data as CallData;

	const outcomeBadgeVariant = call.outcome === "success" ? "default" : "secondary";
	const confirmedData = call.capturedData ? extractConfirmedData(call.capturedData) : {};

	const comparisonRows = FIELD_MAP
		.map(({ field, confirmedKey, originalKey, isDate }) => {
			const confirmedRaw = formatValue(confirmedData[confirmedKey]);
			if (confirmedRaw === "-") return null;

			const originalRaw = originalKey && originalContext?.[originalKey]
				? formatValue(originalContext[originalKey])
				: "-";

			return {
				field,
				original: isDate && originalRaw !== "-" ? formatMonthYear(originalRaw) : originalRaw,
				confirmed: isDate ? formatMonthYear(confirmedRaw) : confirmedRaw,
				hasOriginal: originalRaw !== "-",
				isMatch: originalRaw !== "-" && valuesMatch(field, originalRaw, confirmedRaw),
			};
		})
		.filter(Boolean) as { field: string; original: string; confirmed: string; hasOriginal: boolean; isMatch: boolean }[];

	const messages = typeof call.transcript === "string" ? parseTranscript(call.transcript) : [];

	return (
		<div className="w-full max-w-2xl space-y-4">
			{/* Status row */}
			<div className="flex items-center gap-3 flex-wrap">
				<div className="flex items-center gap-1.5 text-sm">
					<Phone className="size-3.5 text-muted-foreground" />
					<span className="text-muted-foreground">Status:</span>
					<Badge variant={outcomeBadgeVariant} className="text-xs">
						{call.outcome ?? call.status ?? "unknown"}
					</Badge>
				</div>
				{call.duration != null && (
					<div className="flex items-center gap-1.5 text-sm">
						<Clock className="size-3.5 text-muted-foreground" />
						<span className="text-muted-foreground">Duration:</span>
						<span className="font-medium">{formatDuration(call.duration)}</span>
					</div>
				)}
				{call.timedOut && (
					<Badge variant="destructive" className="text-xs">Timed out</Badge>
				)}
			</div>

			{/* Comparison table */}
			{comparisonRows.length > 0 && (
				<div>
					<h4 className="text-xs font-medium text-muted-foreground mb-2">Employment Verification</h4>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="text-xs">Field</TableHead>
									{originalContext && <TableHead className="text-xs">Provided</TableHead>}
									<TableHead className="text-xs">Confirmed</TableHead>
									{originalContext && <TableHead className="text-xs w-10" />}
								</TableRow>
							</TableHeader>
							<TableBody>
								{comparisonRows.map((row) => (
									<TableRow key={row.field}>
										<TableCell className="text-sm font-medium">{row.field}</TableCell>
										{originalContext && (
											<TableCell className="text-sm text-muted-foreground">{row.original}</TableCell>
										)}
										<TableCell className="text-sm font-medium">{row.confirmed}</TableCell>
										{originalContext && (
											<TableCell>
												{row.hasOriginal && (
													row.isMatch
														? <CheckCircle2 className="size-4 text-green-600" />
														: <XCircle className="size-4 text-amber-600" />
												)}
											</TableCell>
										)}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
			)}

			{/* Transcript */}
			{messages.length > 0 && (
				<div>
					<div className="flex items-center gap-1.5 mb-2">
						<MessageSquare className="size-3.5 text-muted-foreground" />
						<h4 className="text-xs font-medium text-muted-foreground">Transcript</h4>
					</div>
					<div className="space-y-3 max-h-80 overflow-y-auto p-3 bg-muted/30 rounded-md">
						{messages.map((msg, i) => (
							<div key={`${msg.speaker}-${i}`} className="space-y-0.5">
								<div
									className={`text-xs font-semibold ${
										msg.speaker === "AI" ? "text-blue-600" : "text-green-600"
									}`}
								>
									{msg.speaker === "AI" ? "Assistant" : "Reference"}
								</div>
								<div className="text-sm leading-relaxed">{msg.text}</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
