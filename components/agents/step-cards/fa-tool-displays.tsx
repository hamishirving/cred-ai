"use client";

import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ToolDisplayProps } from "./tool-display-registry";

type Address = {
	addressLine?: string;
	municipality?: string;
	regionCode?: string;
	postalCode?: string;
	countryCode?: string;
};

type CandidateLicense = {
	number?: string;
	name?: string;
	status?: string;
	issuingAgency?: {
		name?: string;
	};
};

type CandidateData = {
	id: string;
	givenName?: string;
	familyName?: string;
	email?: string;
	clientReferenceId?: string;
	dob?: string;
	ssn?: string;
	address?: Address;
	driversLicense?: {
		licenseNumber?: string;
		issuingAgency?: string;
	};
	licenses?: CandidateLicense[];
};

type CandidateOutput = {
	data?: CandidateData;
	error?: string;
	note?: string;
};

type ReportItem = {
	id: string;
	type: string;
	status: string;
	result: string | null;
	root?: string;
	description?: string;
};

type ScreeningData = {
	id: string;
	packageId?: string;
	packageName?: string;
	candidateId?: string;
	status: string;
	result: string;
	reportItems?: ReportItem[];
	submittedAt?: string;
	estimatedCompletionTime?: string;
	links?: {
		admin?: { web?: string };
	};
};

type ScreeningOutput = {
	data?: ScreeningData;
	error?: string;
};

function maskValue(value?: string): string {
	if (!value) return "—";
	if (value.length <= 4) return value;
	return `••••${value.slice(-4)}`;
}

function formatDateTime(value?: string): string {
	if (!value) return "—";
	return new Date(value).toLocaleString("en-GB", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function statusBadgeVariant(status?: string): "neutral" | "info" | "success" | "warning" | "danger" {
	const s = (status || "").toLowerCase();
	if (s.includes("complete") || s.includes("clear")) return "success";
	if (s.includes("progress")) return "info";
	if (s.includes("consider")) return "warning";
	if (s.includes("adverse") || s.includes("error")) return "danger";
	return "neutral";
}

function formatStatusLabel(value?: string | null): string {
	if (!value) return "Pending";
	return value
		.trim()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.split(" ")
		.map((segment) =>
			segment.length > 0 ? segment[0].toUpperCase() + segment.slice(1).toLowerCase() : segment,
		)
		.join(" ");
}

function resultLabel(result: string | null): string {
	if (!result) return "Pending";
	const normalized = result.toLowerCase();
	if (normalized === "clear") return "Clear";
	if (normalized === "consider") return "Review";
	if (normalized === "adverse") return "Flagged";
	return result;
}

export function FACandidateDisplay({ data }: ToolDisplayProps) {
	const output = (data || {}) as CandidateOutput;
	if (output.error) {
		return <p className="text-sm text-destructive">{output.error}</p>;
	}
	if (!output.data) {
		return <p className="text-sm text-muted-foreground">No candidate data available.</p>;
	}

	const candidate = output.data;
	const fullName = [candidate.givenName, candidate.familyName].filter(Boolean).join(" ");
	const licenses = candidate.licenses || [];

	return (
		<div className="w-full rounded-lg border bg-card text-card-foreground">
			<div className="border-b p-3">
				<div className="flex items-center justify-between gap-2">
					<div>
						<p className="text-sm font-medium">{fullName || "Candidate"}</p>
						<p className="text-xs text-muted-foreground">{candidate.email || "No email"}</p>
					</div>
					<Badge variant="success" className="text-[10px]">Candidate Ready</Badge>
				</div>
				{output.note && (
					<p className="mt-2 text-xs text-muted-foreground">{output.note}</p>
				)}
			</div>

			<div className="grid grid-cols-2 gap-3 p-3 text-xs">
				<div>
					<p className="text-muted-foreground">FA Candidate ID</p>
					<p className="font-mono">{candidate.id}</p>
				</div>
				<div>
					<p className="text-muted-foreground">Client Ref</p>
					<p className="font-mono">{candidate.clientReferenceId || "—"}</p>
				</div>
				<div>
					<p className="text-muted-foreground">DOB</p>
					<p>{candidate.dob || "—"}</p>
				</div>
				<div>
					<p className="text-muted-foreground">SSN</p>
					<p>{maskValue(candidate.ssn)}</p>
				</div>
				<div className="col-span-2">
					<p className="text-muted-foreground">Address</p>
					<p>
						{candidate.address
							? `${candidate.address.addressLine || ""}, ${candidate.address.municipality || ""}, ${candidate.address.regionCode || ""} ${candidate.address.postalCode || ""}`
							: "—"}
					</p>
				</div>
				<div className="col-span-2">
					<p className="text-muted-foreground">Professional License</p>
					<p>
						{licenses.length > 0
							? `${licenses[0].name || "License"} (${maskValue(licenses[0].number)})`
							: "Not provided"}
					</p>
				</div>
			</div>
		</div>
	);
}

export function FAScreeningInitiationDisplay({ data }: ToolDisplayProps) {
	const output = (data || {}) as ScreeningOutput;
	if (output.error) {
		return <p className="text-sm text-destructive">{output.error}</p>;
	}
	if (!output.data) {
		return <p className="text-sm text-muted-foreground">No screening data available.</p>;
	}

	const screening = output.data;
	const reportItems = screening.reportItems || [];
	const completedCount = reportItems.filter((item) => item.status === "complete").length;
	const progressPct = reportItems.length > 0 ? Math.round((completedCount / reportItems.length) * 100) : 0;
	const screeningStatusLabel = formatStatusLabel(screening.status);
	const screeningResultLabel = resultLabel(screening.result);
	const showScreeningResultBadge =
		screeningResultLabel.toLowerCase() !== screeningStatusLabel.toLowerCase();

	return (
		<div className="w-full rounded-lg border bg-card text-card-foreground">
			<div className="border-b p-3">
				<div className="flex items-center justify-between gap-2">
					<div>
						<p className="text-sm font-medium">
							{screening.packageName || "FA Screening"} ({screening.packageId || "—"})
						</p>
						<p className="text-xs text-muted-foreground font-mono">
							Screening ID: {screening.id}
						</p>
					</div>
					<div className="flex gap-1">
						<Badge variant={statusBadgeVariant(screening.status)} className="text-[10px]">
							{screeningStatusLabel}
						</Badge>
						{showScreeningResultBadge && (
							<Badge variant={statusBadgeVariant(screening.result)} className="text-[10px]">
								{screeningResultLabel}
							</Badge>
						)}
					</div>
				</div>
			</div>

			<div className="space-y-3 p-3 text-xs">
				<div className="grid grid-cols-2 gap-3">
					<div>
						<p className="text-muted-foreground">Submitted</p>
						<p>{formatDateTime(screening.submittedAt)}</p>
					</div>
					<div>
						<p className="text-muted-foreground">ETA</p>
						<p>{formatDateTime(screening.estimatedCompletionTime)}</p>
					</div>
				</div>

				<div>
					<div className="mb-1 flex items-center justify-between text-muted-foreground">
						<span>Components</span>
						<span>{completedCount}/{reportItems.length}</span>
					</div>
					<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-[var(--positive)] transition-all"
							style={{ width: `${progressPct}%` }}
						/>
					</div>
				</div>

				{reportItems.length > 0 && (
					<details className="rounded-md border bg-muted/20 p-2.5">
						<summary className="cursor-pointer text-xs font-medium text-muted-foreground">
							View components
						</summary>
						<div className="mt-2 space-y-1.5">
							{reportItems.map((item) => {
								const itemStatusLabel = formatStatusLabel(item.status);
								const itemResultLabel = resultLabel(item.result);
								const showItemResultBadge =
									itemResultLabel.toLowerCase() !== itemStatusLabel.toLowerCase();

								return (
									<div
										key={item.id}
										className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-1 last:border-b-0 last:pb-0"
									>
										<span className="truncate pr-2">{item.type}</span>
										<div className="flex items-center gap-1">
											<Badge variant={statusBadgeVariant(item.status)} className="text-[10px]">
												{itemStatusLabel}
											</Badge>
											{showItemResultBadge && (
												<Badge variant={statusBadgeVariant(item.result || "pending")} className="text-[10px]">
													{itemResultLabel}
												</Badge>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</details>
				)}

				{screening.links?.admin?.web && (
					<a
						href={screening.links.admin.web}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
					>
						Open in Sterling
						<ExternalLink className="size-3" />
					</a>
				)}
			</div>
		</div>
	);
}
