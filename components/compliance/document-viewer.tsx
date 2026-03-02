"use client";

import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
	filePath: string;
	fileName: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DocumentViewer({
	filePath,
	fileName,
	open,
	onOpenChange,
}: DocumentViewerProps) {
	const [url, setUrl] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [numPages, setNumPages] = useState<number | null>(null);
	const [pageNumber, setPageNumber] = useState(1);

	const fetchUrl = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`/api/documents/signed-url?path=${encodeURIComponent(filePath)}`,
			);
			if (!res.ok) {
				setError("Failed to load document");
				return;
			}
			const data = await res.json();
			setUrl(data.url);
		} catch {
			setError("Failed to load document");
		} finally {
			setLoading(false);
		}
	}, [filePath]);

	useEffect(() => {
		if (open) {
			setUrl(null);
			setPageNumber(1);
			setNumPages(null);
			fetchUrl();
		}
	}, [open, fetchUrl]);

	function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
		setNumPages(numPages);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="text-sm font-medium truncate">
						{fileName}
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-auto min-h-0">
					{loading && (
						<div className="space-y-3 p-4">
							<Skeleton className="h-[500px] w-full" />
						</div>
					)}

					{error && (
						<div className="flex items-center justify-center h-64">
							<p className="text-sm text-muted-foreground">{error}</p>
						</div>
					)}

					{url && !loading && (
						<Document
							file={url}
							onLoadSuccess={onDocumentLoadSuccess}
							onLoadError={() => setError("Failed to render PDF")}
							loading={<Skeleton className="h-[500px] w-full" />}
							className="flex justify-center"
						>
							<Page
								pageNumber={pageNumber}
								width={560}
								renderTextLayer
								renderAnnotationLayer
							/>
						</Document>
					)}
				</div>

				{/* Footer: pagination + download */}
				{numPages && (
					<div className="flex items-center justify-between border-t pt-3">
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
						{url && (
							<Button
								variant="ghost"
								size="sm"
								asChild
							>
								<a href={url} target="_blank" rel="noopener noreferrer" download={fileName}>
									<Download className="size-4 mr-1" />
									Download
								</a>
							</Button>
						)}
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
