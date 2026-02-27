"use client";

import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ExecutionModal } from "@/components/placement/execution-modal";
import {
	FileText,
	Upload,
	RefreshCw,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Replace,
	ChevronLeft,
	ChevronRight,
	Download,
	Shield,
	ImageIcon,
	ExternalLink,
} from "lucide-react";
import { streamAgentExecution } from "@/lib/ai/agents/stream-agent-execution";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/toast";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ============================================
// Types
// ============================================

interface VerificationResult {
	decision: "approved" | "rejected" | "needs_review";
	reasoning: string;
	extractedFields: Record<string, string>;
	nextStep: string | null;
	matchedDocumentType: string;
}

interface DocumentIntelligenceDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	placementId: string;
	organisationId: string;
	elementSlug: string;
	elementName: string;
	onVerified?: () => void;
	existingFilePath?: string | null;
	existingFileName?: string | null;
	existingMimeType?: string | null;
	existingExtractedData?: Record<string, unknown> | null;
	profileId?: string | null;
}

// ============================================
// Helpers
// ============================================

function parseStoredVerification(
	data: Record<string, unknown> | null | undefined,
): VerificationResult | null {
	if (!data) return null;
	const v = data._verification as
		| {
				decision: string;
				reasoning: string;
				matchedDocumentType: string;
				nextStep?: string | null;
		  }
		| undefined;
	if (!v?.decision) return null;
	const { _verification, ...fields } = data;
	return {
		decision: v.decision as VerificationResult["decision"],
		reasoning: v.reasoning || "",
		matchedDocumentType: v.matchedDocumentType || "Unknown",
		nextStep: v.nextStep || null,
		extractedFields: Object.fromEntries(
			Object.entries(fields).map(([k, val]) => [k, String(val)]),
		),
	};
}

// ============================================
// Component
// ============================================

export function DocumentIntelligenceDialog({
	open,
	onOpenChange,
	placementId,
	organisationId,
	elementSlug,
	elementName,
	onVerified,
	existingFilePath,
	existingFileName,
	existingMimeType,
	existingExtractedData,
	profileId,
}: DocumentIntelligenceDialogProps) {
	const hasExistingFile = !!existingFilePath;
	const isPdf =
		existingMimeType?.includes("pdf") ||
		existingFilePath?.toLowerCase().endsWith(".pdf");

	// Left pane: document preview
	const [docUrl, setDocUrl] = useState<string | null>(null);
	const [docLoading, setDocLoading] = useState(false);
	const [docError, setDocError] = useState<string | null>(null);
	const [numPages, setNumPages] = useState<number | null>(null);
	const [pageNumber, setPageNumber] = useState(1);

	// Right pane: verification
	const [file, setFile] = useState<File | null>(null);
	const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
	const [replacing, setReplacing] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [result, setResult] = useState<VerificationResult | null>(null);

	// After uploading a new file, update the preview on the left
	const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
	const [uploadedIsPdf, setUploadedIsPdf] = useState(false);

	// Registry verification (BLS agent chain)
	const [modalExecution, setModalExecution] = useState<{
		agentId: string;
		executionId: string;
		agentName: string;
	} | null>(null);
	const [verifiedDocumentUrl, setVerifiedDocumentUrl] = useState<string | null>(
		null,
	);
	const [verifyingWithRegistry, setVerifyingWithRegistry] = useState(false);

	// Fetch signed URL for existing document
	const fetchDocUrl = useCallback(async () => {
		if (!existingFilePath) return;
		setDocLoading(true);
		setDocError(null);
		try {
			const res = await fetch(
				`/api/documents/signed-url?path=${encodeURIComponent(existingFilePath)}`,
			);
			if (!res.ok) {
				setDocError("Failed to load document");
				return;
			}
			const data = await res.json();
			setDocUrl(data.url);
		} catch {
			setDocError("Failed to load document");
		} finally {
			setDocLoading(false);
		}
	}, [existingFilePath]);

	useEffect(() => {
		if (open && hasExistingFile) {
			setDocUrl(null);
			setPageNumber(1);
			setNumPages(null);
			fetchDocUrl();
		}
	}, [open, hasExistingFile, fetchDocUrl]);

	// Load stored verification results when dialog opens or data changes
	useEffect(() => {
		if (!open) return;
		// Only set stored result if we don't already have a fresh result from this session
		if (!result) {
			const stored = parseStoredVerification(existingExtractedData);
			if (stored) setResult(stored);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally run on open/data change, not result
	}, [open, existingExtractedData]);

	// Set verifiedDocumentUrl when reopening with a stored approved result
	useEffect(() => {
		if (result?.decision === "approved" && docUrl && !verifiedDocumentUrl) {
			setVerifiedDocumentUrl(docUrl);
		}
	}, [result, docUrl, verifiedDocumentUrl]);

	const showUploadArea = !hasExistingFile || replacing;

	// Single source of truth for left pane preview
	// Priority: uploadedFileUrl > local file preview > existing doc URL
	const previewUrl = uploadedFileUrl || filePreviewUrl || docUrl;
	const previewIsPdf = uploadedFileUrl
		? uploadedIsPdf
		: filePreviewUrl
			? (file?.type.includes("pdf") ?? false)
			: isPdf;

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const selected = e.target.files?.[0];
			if (!selected) return;
			setFile(selected);
			setResult(null);
			if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
			const url = URL.createObjectURL(selected);
			setFilePreviewUrl(url);
			setUploadedFileUrl(null);
		},
		[filePreviewUrl],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const dropped = e.dataTransfer.files[0];
			if (!dropped) return;
			setFile(dropped);
			setResult(null);
			if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
			const url = URL.createObjectURL(dropped);
			setFilePreviewUrl(url);
			setUploadedFileUrl(null);
		},
		[filePreviewUrl],
	);

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
				documentUrl = uploadData.signedUrl || dataUrl;

				// Switch left pane to the uploaded signed URL
				if (uploadData.signedUrl) {
					setUploadedFileUrl(uploadData.signedUrl);
					setUploadedIsPdf(file.type.includes("pdf"));
					setPageNumber(1);
					setNumPages(null);
				}

				// Clear local file state so signed URL takes over display
				setFile(null);
				if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
				setFilePreviewUrl(null);
			} else if (hasExistingFile && docUrl) {
				documentUrl = docUrl;
			} else {
				return;
			}

			const response = await fetch(
				`/api/placements/${placementId}/verify-document`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						elementSlug,
						organisationId,
						profileId,
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
			setVerifiedDocumentUrl(documentUrl);

			// Always refresh parent data so stored results persist
			onVerified?.();
		} catch {
			toast({ type: "error", description: "Failed to verify document" });
		} finally {
			setSubmitting(false);
		}
	}

	function handleClose(openState: boolean) {
		if (!openState) {
			if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
			setFile(null);
			setFilePreviewUrl(null);
			setResult(null);
			setReplacing(false);
			setUploadedFileUrl(null);
			setDocUrl(null);
			setDocError(null);
			setVerifiedDocumentUrl(null);
			setVerifyingWithRegistry(false);
		}
		onOpenChange(openState);
	}

	function clearNewFile() {
		setFile(null);
		if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
		setFilePreviewUrl(null);
		setUploadedFileUrl(null);
		if (hasExistingFile) setReplacing(false);
	}

	function resetVerification() {
		setResult(null);
		setFile(null);
		setReplacing(false);
		if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
		setFilePreviewUrl(null);
		setUploadedFileUrl(null);
		setVerifiedDocumentUrl(null);
		setVerifyingWithRegistry(false);
	}

	// BLS registry verification
	const isBls = elementSlug.includes("bls");
	const showRegistryButton =
		isBls &&
		result?.decision === "approved" &&
		!verifyingWithRegistry &&
		!!profileId &&
		!!verifiedDocumentUrl;

	async function handleVerifyWithRegistry() {
		if (!profileId || !verifiedDocumentUrl) return;
		setVerifyingWithRegistry(true);
		try {
			const response = await fetch(
				"/api/agents/verify-bls-certificate/execute",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						profileId,
						organisationId,
						documentUrl: verifiedDocumentUrl,
					}),
				},
			);
			if (!response.ok || !response.body) {
				toast({
					type: "error",
					description: "Failed to start registry verification",
				});
				return;
			}
			await streamAgentExecution(response, (execId) => {
				setModalExecution({
					agentId: "verify-bls-certificate",
					executionId: execId,
					agentName: "BLS Verification",
				});
			});
		} catch {
			toast({
				type: "error",
				description: "Failed to verify with registry",
			});
		} finally {
			setVerifyingWithRegistry(false);
		}
	}

	return (
		<>
			<Dialog open={open} onOpenChange={handleClose}>
				<DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
					<DialogHeader className="px-6 pt-5 pb-3 border-b border-border shrink-0">
						<DialogTitle className="flex items-center gap-2 text-base">
							<Shield className="size-4" />
							Document Intelligence
						</DialogTitle>
						<DialogDescription className="text-xs">
							{elementName}
						</DialogDescription>
					</DialogHeader>

					<div
						className="flex flex-1 min-h-0 overflow-hidden"
						style={{ minHeight: "500px" }}
					>
						{/* Left pane: Document preview */}
						<div className="w-[55%] border-r border-border flex flex-col min-h-0 bg-muted/20">
							<div className="flex-1 overflow-auto min-h-0">
								{/* Loading */}
								{docLoading && (
									<div className="p-4">
										<Skeleton className="h-[500px] w-full" />
									</div>
								)}

								{/* Error */}
								{docError && !docLoading && (
									<div className="flex items-center justify-center h-64">
										<p className="text-sm text-muted-foreground">{docError}</p>
									</div>
								)}

								{/* Document preview — single block with priority URL */}
								{previewUrl && !docLoading && !docError && (
									<div className="flex items-center justify-center p-4 h-full">
										{previewIsPdf ? (
											<Document
												key={previewUrl}
												file={previewUrl}
												onLoadSuccess={({ numPages: n }) => setNumPages(n)}
												onLoadError={() => setDocError("Failed to render PDF")}
												loading={<Skeleton className="h-[500px] w-full" />}
												className="flex justify-center"
											>
												<Page
													pageNumber={pageNumber}
													width={480}
													renderTextLayer
													renderAnnotationLayer
												/>
											</Document>
										) : (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={previewUrl}
												alt="Document preview"
												className="max-w-full max-h-full object-contain rounded"
											/>
										)}
									</div>
								)}

								{/* No document yet */}
								{!previewUrl && !docLoading && !docError && (
									<div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-8">
										<ImageIcon className="size-12 opacity-30" />
										<p className="text-sm">
											Upload a document to preview it here
										</p>
									</div>
								)}
							</div>

							{/* PDF pagination + download */}
							{numPages && numPages > 1 && (
								<div className="flex items-center justify-between border-t border-border px-4 py-2 shrink-0 bg-background">
									<div className="flex items-center gap-1">
										<Button
											variant="ghost"
											size="sm"
											disabled={pageNumber <= 1}
											onClick={() => setPageNumber((p) => p - 1)}
										>
											<ChevronLeft className="size-4" />
										</Button>
										<span className="text-xs text-muted-foreground tabular-nums px-2">
											{pageNumber} / {numPages}
										</span>
										<Button
											variant="ghost"
											size="sm"
											disabled={pageNumber >= numPages}
											onClick={() => setPageNumber((p) => p + 1)}
										>
											<ChevronRight className="size-4" />
										</Button>
									</div>
									{(uploadedFileUrl || docUrl) && (
										<Button variant="ghost" size="sm" asChild>
											<a
												href={uploadedFileUrl || docUrl || ""}
												target="_blank"
												rel="noopener noreferrer"
												download={existingFileName || "document"}
											>
												<Download className="size-4 mr-1" />
												Download
											</a>
										</Button>
									)}
								</div>
							)}
						</div>

						{/* Right pane: Verification */}
						<div className="w-[45%] flex flex-col min-h-0">
							<div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
								{/* Verifying loading state */}
								{submitting && (
									<div className="flex flex-col items-center justify-center h-full gap-4 text-center">
										<div className="relative">
											<Shield className="size-10 text-primary/20" />
											<RefreshCw className="size-5 text-primary animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
										</div>
										<div className="space-y-1.5">
											<p className="text-sm font-medium">Analysing document…</p>
											<p className="text-xs text-muted-foreground max-w-[240px]">
												Checking against acceptance criteria and extracting key
												fields
											</p>
										</div>
										<div className="space-y-2 w-full max-w-[260px] mt-2">
											<Skeleton className="h-3 w-full" />
											<Skeleton className="h-3 w-4/5" />
											<Skeleton className="h-3 w-3/5" />
										</div>
									</div>
								)}

								{/* Existing file info with replace option */}
								{!submitting &&
									!result &&
									hasExistingFile &&
									!replacing &&
									!file && (
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
								{!submitting && !result && showUploadArea && (
									<div
										onDragOver={(e) => e.preventDefault()}
										onDrop={handleDrop}
										className="relative rounded-md border-2 border-dashed border-border hover:border-primary/50 transition-colors duration-150 px-4 py-6 text-center"
									>
										{file ? (
											<div className="flex items-center gap-3">
												<FileText className="size-8 text-muted-foreground shrink-0" />
												<div className="flex-1 text-left min-w-0">
													<p className="text-sm font-medium truncate">
														{file.name}
													</p>
													<p className="text-[10px] text-muted-foreground">
														{(file.size / 1024).toFixed(0)} KB
													</p>
												</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={clearNewFile}
												>
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
								{!submitting && result && (
									<div className="space-y-3">
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
												className="text-xs font-medium"
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

										<div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
											<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
												Reasoning
											</p>
											<p className="text-xs leading-relaxed">
												{result.reasoning}
											</p>
										</div>

										{Object.keys(result.extractedFields).length > 0 && (
											<div className="space-y-1.5">
												<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
													Extracted Fields
												</p>
												<div className="grid grid-cols-1 gap-y-1">
													{Object.entries(result.extractedFields).map(
														([key, value]) => (
															<div
																key={key}
																className="flex items-baseline justify-between gap-2"
															>
																<span className="text-[10px] text-muted-foreground capitalize">
																	{key.replace(/([A-Z])/g, " $1").trim()}
																</span>
																<span className="text-xs text-right truncate">
																	{value}
																</span>
															</div>
														),
													)}
												</div>
											</div>
										)}

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
							{!submitting && (
								<div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0">
									<Button
										variant="outline"
										size="sm"
										onClick={() => handleClose(false)}
									>
										{result ? "Close" : "Cancel"}
									</Button>
									{!result && (
										<Button
											size="sm"
											onClick={handleSubmit}
											disabled={!file && !hasExistingFile}
										>
											{file ? "Upload & Verify" : "Verify Document"}
										</Button>
									)}
									{result && (
										<div className="flex items-center gap-2">
											{showRegistryButton && (
												<Button
													size="sm"
													onClick={handleVerifyWithRegistry}
													disabled={verifyingWithRegistry}
												>
													{verifyingWithRegistry ? (
														<>
															<RefreshCw className="size-3 animate-spin mr-1" />
															Verifying…
														</>
													) : (
														<>
															<ExternalLink className="size-3 mr-1" />
															Verify with registry
														</>
													)}
												</Button>
											)}
											<Button
												variant="outline"
												size="sm"
												onClick={resetVerification}
											>
												Verify Another
											</Button>
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{modalExecution && (
				<ExecutionModal
					open={!!modalExecution}
					onOpenChange={(isOpen) => {
						if (!isOpen) setModalExecution(null);
					}}
					agentId={modalExecution.agentId}
					executionId={modalExecution.executionId}
					agentName={modalExecution.agentName}
				/>
			)}
		</>
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
