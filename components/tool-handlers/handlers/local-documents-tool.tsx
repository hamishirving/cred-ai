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
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface DocumentResult {
	id: string;
	fileName: string | null;
	evidenceType: string;
	source: string;
	status: string;
	verificationStatus: string;
	aiConfidence: number | null;
	elementName: string;
	elementCategory: string | null;
	issuedAt: string | null;
	expiresAt: string | null;
	verifiedAt: string | null;
}

interface DocumentsOutput {
	data?: {
		count: number;
		documents: DocumentResult[];
	};
	error?: string;
}

function statusVariant(
	status: string,
): "success" | "warning" | "danger" | "secondary" {
	const s = status.toLowerCase();
	if (s === "approved") return "success";
	if (s === "pending" || s === "processing" || s === "requires_review")
		return "warning";
	if (s === "rejected" || s === "expired") return "danger";
	return "secondary";
}

function formatDate(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

function formatLabel(str: string): string {
	return str
		.replace(/[_-]/g, " ")
		.toLowerCase()
		.replace(/^\w/, (c) => c.toUpperCase());
}

export function LocalDocumentsTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, DocumentsOutput>) {
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Get Documents"
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

	const d = output.data;
	if (!d || d.count === 0) {
		return (
			<div className="text-muted-foreground text-sm py-2">
				No documents found
			</div>
		);
	}

	return (
		<div className="not-prose my-3 w-full space-y-2">
			<div className="text-muted-foreground text-xs">
				{d.count} document{d.count !== 1 ? "s" : ""}
			</div>
			<div className="overflow-hidden rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead>Requirement</TableHead>
							<TableHead>File</TableHead>
							<TableHead>Type</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Verification</TableHead>
							<TableHead>Expires</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{d.documents.map((doc) => (
							<TableRow key={doc.id}>
								<TableCell className="py-2 text-sm font-medium">
									{doc.elementName}
								</TableCell>
								<TableCell className="py-2 text-muted-foreground text-sm max-w-40 truncate">
									{doc.fileName || "—"}
								</TableCell>
								<TableCell className="py-2">
									<Badge variant="outline" className="text-xs">
										{formatLabel(doc.evidenceType)}
									</Badge>
								</TableCell>
								<TableCell className="py-2">
									<Badge
										variant={statusVariant(doc.status)}
										className="text-xs"
									>
										{formatLabel(doc.status)}
									</Badge>
								</TableCell>
								<TableCell className="py-2 text-muted-foreground text-sm">
									{formatLabel(doc.verificationStatus)}
								</TableCell>
								<TableCell className="py-2 text-muted-foreground text-sm tabular-nums">
									{formatDate(doc.expiresAt)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
