"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Download, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface TranscriptMessage {
	speaker: "AI" | "User";
	text: string;
}

interface TranscriptViewerProps {
	transcript: string | Array<{ role?: string; content?: string; message?: string }> | null | undefined;
	title?: string;
	description?: string;
	downloadFilename?: string;
	className?: string;
}

function parseTranscript(transcript: TranscriptViewerProps["transcript"]): TranscriptMessage[] {
	if (!transcript) return [];

	// Handle array format (from VAPI)
	if (Array.isArray(transcript)) {
		return transcript
			.filter((msg) => msg.content || msg.message)
			.map((msg) => ({
				speaker: (msg.role === "assistant" || msg.role === "AI") ? "AI" : "User",
				text: msg.content || msg.message || "",
			}));
	}

	// Handle string format
	if (typeof transcript !== "string") {
		return [];
	}

	const lines = transcript.split("\n");
	const messages: TranscriptMessage[] = [];
	let currentSpeaker: "AI" | "User" | null = null;
	let currentText = "";

	for (const line of lines) {
		if (line.startsWith("AI:") || line.startsWith("User:")) {
			// Save previous message
			if (currentSpeaker && currentText) {
				messages.push({ speaker: currentSpeaker, text: currentText.trim() });
			}
			// Start new message
			const [speaker, ...rest] = line.split(":");
			currentSpeaker = speaker as "AI" | "User";
			currentText = rest.join(":").trim();
		} else if (line.trim()) {
			// Continuation of current message
			currentText += " " + line.trim();
		}
	}

	// Don't forget the last message
	if (currentSpeaker && currentText) {
		messages.push({ speaker: currentSpeaker, text: currentText.trim() });
	}

	return messages;
}

export function TranscriptViewer({
	transcript,
	title = "Call Transcript",
	description = "Full conversation recording",
	downloadFilename = "transcript.txt",
	className,
}: TranscriptViewerProps) {
	const messages = parseTranscript(transcript);

	const handleDownload = () => {
		// Convert transcript to string for download
		let textContent: string;
		if (typeof transcript === "string") {
			textContent = transcript;
		} else if (Array.isArray(transcript)) {
			textContent = transcript
				.map((msg) => `${msg.role === "assistant" ? "AI" : "User"}: ${msg.content || msg.message || ""}`)
				.join("\n\n");
		} else {
			textContent = messages.map((msg) => `${msg.speaker}: ${msg.text}`).join("\n\n");
		}

		const blob = new Blob([textContent], { type: "text/plain" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = downloadFilename;
		a.click();
		URL.revokeObjectURL(url);
	};

	if (messages.length === 0) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle>{title}</CardTitle>
					<CardDescription>No transcript available</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-4 max-h-96 overflow-y-auto p-4 bg-muted/30 rounded-md">
					{messages.map((msg, index) => (
						<div
							key={`${msg.speaker}-${index}`}
							className={cn(
								"flex gap-3",
								msg.speaker === "AI" ? "justify-start" : "justify-end",
							)}
						>
							{msg.speaker === "AI" && (
								<div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
									<Bot className="h-4 w-4 text-blue-600" />
								</div>
							)}
							<div
								className={cn(
									"max-w-[80%] rounded-lg px-4 py-2 text-sm",
									msg.speaker === "AI"
										? "bg-blue-50 text-blue-900"
										: "bg-green-50 text-green-900",
								)}
							>
								<div
									className={cn(
										"text-xs font-semibold mb-1",
										msg.speaker === "AI" ? "text-blue-600" : "text-green-600",
									)}
								>
									{msg.speaker === "AI" ? "Assistant" : "Recipient"}
								</div>
								<div className="leading-relaxed">{msg.text}</div>
							</div>
							{msg.speaker === "User" && (
								<div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
									<User className="h-4 w-4 text-green-600" />
								</div>
							)}
						</div>
					))}
				</div>
				<Button variant="outline" size="sm" onClick={handleDownload}>
					<Download className="mr-2 h-4 w-4" />
					Download Transcript
				</Button>
			</CardContent>
		</Card>
	);
}
