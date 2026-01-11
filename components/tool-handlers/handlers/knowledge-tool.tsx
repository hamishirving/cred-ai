"use client";

import { useState } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, ExternalLink, FileText } from "lucide-react";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface KnowledgeChunk {
	text: string;
	source: string;
	sourceUrl: string | null;
	documentType: string | null;
	score: number;
}

interface KnowledgeOutput {
	data?: KnowledgeChunk[] | null;
	message?: string;
	error?: string;
}

export function KnowledgeTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<{ query: string }, KnowledgeOutput>) {
	const [isOpen, setIsOpen] = useState(false);

	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Search Knowledge"
				state={state}
				input={input}
			/>
		);
	}

	if (output.error) {
		return <div className="text-destructive text-sm">{output.error}</div>;
	}

	if (!output.data || output.data.length === 0) {
		return (
			<div className="text-muted-foreground text-sm">
				No relevant documents found.
			</div>
		);
	}

	// Get unique source names
	const uniqueSources = [...new Set(output.data.map((c) => c.source))];

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
				{isOpen ? (
					<ChevronDown className="h-3 w-3" />
				) : (
					<ChevronRight className="h-3 w-3" />
				)}
				<FileText className="h-3 w-3" />
				<span>
					{uniqueSources.length} source{uniqueSources.length !== 1 ? "s" : ""} referenced
				</span>
			</CollapsibleTrigger>
			<CollapsibleContent className="mt-2 space-y-1.5">
				{output.data.map((chunk, i) => (
					<SourceItem key={i} chunk={chunk} />
				))}
			</CollapsibleContent>
		</Collapsible>
	);
}

const PREVIEW_LENGTH = 80;
const EXPANDED_LENGTH = 400;

function SourceItem({ chunk }: { chunk: KnowledgeChunk }) {
	const [isOpen, setIsOpen] = useState(false);
	const [showFull, setShowFull] = useState(false);

	// Strip document name from start of text if present (Ragie includes it)
	let cleanText = chunk.text;
	if (cleanText.startsWith(chunk.source)) {
		cleanText = cleanText.slice(chunk.source.length).trimStart();
	}

	// Truncate text for preview (collapsed state)
	const previewText =
		cleanText.length > PREVIEW_LENGTH
			? `${cleanText.slice(0, PREVIEW_LENGTH)}...`
			: cleanText;

	// Truncate text for expanded state (unless showing full)
	const expandedText =
		showFull || cleanText.length <= EXPANDED_LENGTH
			? cleanText
			: `${cleanText.slice(0, EXPANDED_LENGTH)}...`;

	const canShowMore = cleanText.length > EXPANDED_LENGTH;

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<div className="rounded-md border bg-muted/30 px-2.5 py-1.5">
				<CollapsibleTrigger className="flex items-center gap-1.5 text-xs w-full text-left">
					{isOpen ? (
						<ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
					) : (
						<ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
					)}
					<span className="truncate text-muted-foreground">{chunk.source}</span>
					{chunk.sourceUrl && (
						<a
							href={chunk.sourceUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
							onClick={(e) => e.stopPropagation()}
						>
							<ExternalLink className="h-3 w-3" />
						</a>
					)}
				</CollapsibleTrigger>
				<CollapsibleContent className="mt-1.5 text-xs text-muted-foreground">
					<p className="whitespace-pre-wrap">{expandedText}</p>
					{canShowMore && (
						<button
							type="button"
							onClick={() => setShowFull(!showFull)}
							className="mt-1 text-[11px] text-primary hover:underline"
						>
							{showFull ? "Show less" : "Show more"}
						</button>
					)}
				</CollapsibleContent>
				{!isOpen && (
					<p className="mt-1 text-[11px] text-muted-foreground/70 line-clamp-1">
						{previewText}
					</p>
				)}
			</div>
		</Collapsible>
	);
}
