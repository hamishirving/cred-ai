"use client";

import { useState, useCallback } from "react";
import {
	FileText,
	Upload,
	RefreshCw,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Replace,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/toast";

// ============================================
// Types
// ============================================

interface VerificationResult {
	decision: "approved" | "rejected" | "needs_review";
	reasoning: string;
	extractedFields: Record<string, unknown>;
	nextStep: string | null;
	matchedDocumentType: string;
}

interface DocumentVerifyDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	placementId: string;
	organisationId: string;
	elementSlug: string;
	elementName: string;
	onVerified?: () => void;
	/** Supabase storage path for an existing evidence file */
	existingFilePath?: string | null;
	/** Display name for the existing evidence file */
	existingFileName?: string | null;
	/** Profile ID for uploading new evidence */
	profileId?: string | null;
}

function formatFieldLabel(key: string): string {
	return key.replace(/([A-Z])/g, " $1").trim();
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function renderExtractedFieldValue(key: string, value: unknown) {
	if (key === "workHistory" && Array.isArray(value)) {
		const items = value.filter(isPlainObject);
		if (items.length === 0) {
			return <span className="text-muted-foreground">No work history found</span>;
		}
		return (
			<div className="space-y-1.5">
				{items.map((item, index) => {
					const role =
						typeof item.role === "string" && item.role
							? item.role
							: typeof item.title === "string" && item.title
								? item.title
								: "Role not specified";
					const employer =
						typeof item.employer === "string" && item.employer
							? item.employer
							: "Employer not specified";
					const dateParts = [
						typeof item.startDate === "string" ? item.startDate : null,
						typeof item.endDate === "string" && item.endDate
							? item.endDate
							: item.isCurrent === true
								? "Present"
								: null,
					].filter(Boolean);
					return (
						<div
							key={`${index}-${employer}-${role}`}
							className="rounded border border-border/60 px-2 py-1.5"
						>
							<p className="text-xs font-medium">{role}</p>
							<p className="text-xs text-muted-foreground">{employer}</p>
							{dateParts.length > 0 && (
								<p className="text-[11px] text-muted-foreground">
									{dateParts.join(" - ")}
								</p>
							)}
						</div>
					);
				})}
			</div>
		);
	}

	if (Array.isArray(value)) {
		if (value.length === 0) {
			return <span className="text-muted-foreground">None</span>;
		}
		const primitiveValues = value.filter(
			(item) =>
				typeof item === "string" ||
				typeof item === "number" ||
				typeof item === "boolean",
		);
		if (primitiveValues.length === value.length) {
			return <span>{primitiveValues.map(String).join(", ")}</span>;
		}
		return <span>{value.length} entries</span>;
	}

	if (isPlainObject(value)) {
		return (
			<pre className="text-[11px] whitespace-pre-wrap break-words rounded border border-border/60 bg-muted/40 px-2 py-1.5">
				{JSON.stringify(value, null, 2)}
			</pre>
		);
	}

	if (value === null || value === undefined || value === "") {
		return <span className="text-muted-foreground">—</span>;
	}

	return <span>{String(value)}</span>;
}

// ============================================
// Component
// ============================================

export function DocumentVerifyDialog({
	open,
	onOpenChange,
	placementId,
	organisationId,
	elementSlug,
	elementName,
	onVerified,
	existingFilePath,
	existingFileName,
	profileId,
}: DocumentVerifyDialogProps) {
	const hasExistingFile = !!existingFilePath;
	const [file, setFile] = useState<File | null>(null);
	const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
	const [replacing, setReplacing] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<VerificationResult | null>(null);

	const showUploadArea = !hasExistingFile || replacing;

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selected = e.target.files?.[0];
			if (!selected) return;
			setFile(selected);
			setResult(null);

			const url = URL.createObjectURL(selected);
			setFilePreviewUrl(url);
		},
		[],
	);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		const dropped = e.dataTransfer.files[0];
		if (!dropped) return;
		setFile(dropped);
		setResult(null);
		const url = URL.createObjectURL(dropped);
		setFilePreviewUrl(url);
	}, []);

	async function readFileAsDataUrl(f: File): Promise<string> {
		const reader = new FileReader();
		return new Promise<string>((resolve, reject) => {
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(f);
		});
	}

	async function handleSubmit() {
		if (!file && !hasExistingFile) return;
		setSubmitting(true);
		setResult(null);

		try {
			let documentUrl: string;

			if (file) {
				// New file uploaded — upload to storage first, then verify
				const dataUrl = await readFileAsDataUrl(file);

				const uploadRes = await fetch(
					`/api/placements/${placementId}/upload-evidence`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							elementSlug,
							organisationId,
							profileId,
							fileData: dataUrl,
							fileName: file.name,
							mimeType: file.type,
						}),
					},
				);

				if (!uploadRes.ok) {
					const err = await uploadRes.json().catch(() => null);
					toast({
						type: "error",
						description: err?.error || "Failed to upload document",
					});
					return;
				}

				const uploadData = await uploadRes.json();
				// Use the signed URL for verification
				documentUrl = uploadData.signedUrl || dataUrl;
			} else if (hasExistingFile && existingFilePath) {
				// Use existing file — fetch signed URL
				const signedRes = await fetch(
					`/api/documents/signed-url?path=${encodeURIComponent(existingFilePath)}`,
				);
				if (!signedRes.ok) {
					toast({
						type: "error",
						description: "Failed to load existing document",
					});
					return;
				}
				const signedData = await signedRes.json();
				documentUrl = signedData.url;
			} else {
				return;
			}

			// Verify
			const response = await fetch(
				`/api/placements/${placementId}/verify-document`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						elementSlug,
						organisationId,
						documentUrl,
					}),
				},
			);

			if (!response.ok) {
				const data = await response.json().catch(() => null);
				toast({
					type: "error",
					description: data?.error || "Verification failed",
				});
				return;
			}

			const data = await response.json();
			setResult(data);

			if (data.decision === "approved") {
				onVerified?.();
			}
		} catch {
			toast({ type: "error", description: "Failed to verify document" });
		} finally {
			setSubmitting(false);
		}
	}

	function handleClose(open: boolean) {
		if (!open) {
			if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
			setFile(null);
			setFilePreviewUrl(null);
			setResult(null);
			setReplacing(false);
		}
		onOpenChange(open);
	}

	function clearNewFile() {
		setFile(null);
		if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
		setFilePreviewUrl(null);
		if (hasExistingFile) setReplacing(false);
	}

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-base">
						<FileText className="size-4" />
						Verify Document
					</DialogTitle>
					<DialogDescription className="text-xs">
						{elementName}
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-4 min-h-0">
					{/* Existing file with replace option */}
					{!result && hasExistingFile && !replacing && !file && (
						<div className="rounded-md border border-border bg-muted/30 px-4 py-3">
							<div className="flex items-center gap-3">
								<FileText className="size-8 text-muted-foreground shrink-0" />
								<div className="flex-1 text-left min-w-0">
									<p className="text-sm font-medium truncate">
										{existingFileName || "Uploaded document"}
									</p>
									<p className="text-[10px] text-muted-foreground">
										Existing evidence on file
									</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setReplacing(true)}
									className="text-xs"
								>
									<Replace className="size-3 mr-1" />
									Replace
								</Button>
							</div>
						</div>
					)}

					{/* File upload area */}
					{!result && showUploadArea && (
						<div
							onDragOver={(e) => e.preventDefault()}
							onDrop={handleDrop}
							className="relative rounded-md border-2 border-dashed border-border hover:border-primary/50 transition-colors duration-150 px-4 py-6 text-center"
						>
							{file ? (
								<div className="flex items-center gap-3">
									<FileText className="size-8 text-muted-foreground shrink-0" />
									<div className="flex-1 text-left min-w-0">
										<p className="text-sm font-medium truncate">{file.name}</p>
										<p className="text-[10px] text-muted-foreground">
											{(file.size / 1024).toFixed(0)} KB
										</p>
									</div>
									<Button variant="ghost" size="sm" onClick={clearNewFile}>
										Remove
									</Button>
								</div>
							) : (
								<label className="cursor-pointer block">
									<Upload className="size-6 text-muted-foreground mx-auto mb-2" />
									<p className="text-sm text-muted-foreground">
										{hasExistingFile
											? "Drop a replacement document or "
											: "Drop a document here or "}
										<span className="text-primary underline underline-offset-2">
											browse
										</span>
									</p>
									<p className="text-[10px] text-muted-foreground mt-1">
										PDF, JPG, or PNG
									</p>
									<input
										type="file"
										accept=".pdf,.jpg,.jpeg,.png,.webp"
										onChange={handleFileChange}
										className="sr-only"
									/>
								</label>
							)}
						</div>
					)}

					{/* Verification result */}
					{result && (
						<div className="space-y-3">
							{/* Decision badge */}
							<div className="flex items-center gap-2">
								<DecisionIcon decision={result.decision} />
								<Badge
									variant={
										result.decision === "approved"
											? "success"
											: result.decision === "rejected"
												? "danger"
												: "warning"
									}
									className="text-xs font-medium capitalize"
								>
									{result.decision === "approved"
										? "Approved"
										: result.decision === "needs_review"
											? "Needs Review"
											: "Rejected"}
								</Badge>
								<span className="text-xs text-muted-foreground">
									{result.matchedDocumentType}
								</span>
							</div>

							{/* Reasoning */}
							<div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
								<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
									Reasoning
								</p>
								<p className="text-xs leading-relaxed">{result.reasoning}</p>
							</div>

							{/* Extracted fields */}
							{Object.keys(result.extractedFields).length > 0 && (
								<div className="space-y-1.5">
									<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
										Extracted Fields
									</p>
									<div className="grid grid-cols-1 gap-y-1.5">
										{Object.entries(result.extractedFields).map(
											([key, value]) => (
												<div
													key={key}
													className="space-y-1 rounded border border-border/50 px-2 py-1.5"
												>
													<p className="text-[10px] text-muted-foreground capitalize">
														{formatFieldLabel(key)}
													</p>
													<div className="text-xs">
														{renderExtractedFieldValue(key, value)}
													</div>
												</div>
											),
										)}
									</div>
								</div>
							)}

							{/* Next step */}
							{result.nextStep && (
								<div className="rounded-md border border-border bg-muted/30 px-3 py-2">
									<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
										Next Step
									</p>
									<p className="text-xs">{result.nextStep}</p>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between pt-3 border-t border-border shrink-0">
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleClose(false)}
						disabled={submitting}
					>
						{result ? "Close" : "Cancel"}
					</Button>
					{!result && (
						<Button
							size="sm"
							onClick={handleSubmit}
							disabled={(!file && !hasExistingFile) || submitting}
						>
							{submitting ? (
								<>
									<RefreshCw className="size-3 animate-spin mr-1.5" />
									{file ? "Uploading & Verifying…" : "Verifying…"}
								</>
							) : file ? (
								"Upload & Verify"
							) : (
								"Verify Document"
							)}
						</Button>
					)}
					{result && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setResult(null);
								setFile(null);
								setReplacing(false);
								if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
								setFilePreviewUrl(null);
							}}
						>
							Verify Another
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function DecisionIcon({
	decision,
}: {
	decision: "approved" | "rejected" | "needs_review";
}) {
	switch (decision) {
		case "approved":
			return <CheckCircle2 className="size-5 text-[var(--positive)]" />;
		case "rejected":
			return <XCircle className="size-5 text-destructive" />;
		case "needs_review":
			return <AlertTriangle className="size-5 text-[var(--warning)]" />;
	}
}
