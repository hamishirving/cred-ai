"use client";

import { useState } from "react";
import { Mail, Sparkles, ChevronDown, ChevronUp, RefreshCw, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Response } from "@/components/elements/response";

interface CommunicationItem {
	id: string;
	type: "email";
	direction: "outbound";
	subject: string;
	body: string;
	preview: string;
	status: "sent" | "preview";
	createdAt: string;
	actor: "ai";
	reasoning?: string | null;
}

interface EmailPreview {
	to: string;
	cc?: string;
	subject: string;
	body: string;
}

interface GeneratedEmail {
	insight: {
		id: string;
		priority: string;
		category: string;
		summary: string;
	};
	email: EmailPreview;
	context: {
		candidate: {
			name: string;
			email: string;
			daysInOnboarding: number;
		};
		compliance: {
			completed: number;
			total: number;
			percentage: number;
			blockedByCandidate: string[];
			blockedByAdmin: string[];
			blockedByThirdParty: string[];
		};
		reasoning: string;
	};
}

interface CandidateCommunicationsProps {
	profileId: string;
	organisationId: string;
	candidateName: string;
}

export function CandidateCommunications({
	profileId,
	organisationId,
	candidateName,
}: CandidateCommunicationsProps) {
	const [history, setHistory] = useState<CommunicationItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [generating, setGenerating] = useState(false);
	const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	// Fetch communication history
	const fetchHistory = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(
				`/api/candidates/${profileId}/communications?organisationId=${organisationId}`,
			);
			if (!response.ok) {
				throw new Error("Failed to fetch communications");
			}
			const data = await response.json();
			setHistory(data.history || []);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load");
		} finally {
			setLoading(false);
		}
	};

	// Generate email preview
	const generatePreview = async () => {
		setGenerating(true);
		setError(null);
		try {
			const response = await fetch(
				`/api/candidates/${profileId}/communications`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ organisationId }),
				},
			);
			if (!response.ok) {
				throw new Error("Failed to generate email");
			}
			const data = await response.json();
			if (data.email) {
				setGeneratedEmail(data);
			} else {
				setError(data.message || "No email generated");
			}
			// Refresh history
			await fetchHistory();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Generation failed");
		} finally {
			setGenerating(false);
		}
	};

	// Initial load
	useState(() => {
		fetchHistory();
	});

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold text-[#1c1a15]">Communications</h3>
					<p className="text-sm text-[#8a857d]">
						AI-generated emails and communication history for {candidateName}
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading} className="border-[#e0dcd4] text-[#3d3a32]">
						<RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
						Refresh
					</Button>
					<Button size="sm" onClick={generatePreview} disabled={generating} className="bg-[#4444cf] hover:bg-[#3636b8] text-white">
						<Sparkles className={`mr-2 h-3.5 w-3.5 ${generating ? "animate-pulse" : ""}`} />
						{generating ? "Generating..." : "Preview Next Email"}
					</Button>
				</div>
			</div>

			{/* Error State */}
			{error && (
				<Card className="shadow-none! bg-white border-[#c93d4e]/20">
					<CardContent className="py-4">
						<p className="text-sm text-[#c93d4e]">{error}</p>
					</CardContent>
				</Card>
			)}

			{/* Generated Email Preview */}
			{generatedEmail && (
				<Card className="shadow-none! bg-white border-[#4444cf]/30">
					<CardHeader className="pb-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Sparkles className="h-5 w-5 text-[#4444cf]" />
								<CardTitle className="text-base text-[#1c1a15]">Generated Email Preview</CardTitle>
							</div>
							<Badge variant="outline" className="border-[#e5e2db] text-[#6b6760]">{generatedEmail.insight.priority} priority</Badge>
						</div>
						<CardDescription className="text-[#8a857d]">{generatedEmail.insight.summary}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Email Header */}
						<div className="rounded-md bg-[#faf9f7] p-3 text-sm">
							<p><span className="font-medium text-[#3d3a32]">To:</span> <span className="text-[#6b6760]">{generatedEmail.email.to}</span></p>
							{generatedEmail.email.cc && (
								<p><span className="font-medium text-[#3d3a32]">CC:</span> <span className="text-[#6b6760]">{generatedEmail.email.cc}</span></p>
							)}
							<p><span className="font-medium text-[#3d3a32]">Subject:</span> <span className="text-[#6b6760]">{generatedEmail.email.subject}</span></p>
						</div>

						{/* Email Body */}
						<div className="rounded-md border border-[#e5e2db] p-6 prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-li:my-0">
							<Response>{generatedEmail.email.body}</Response>
						</div>

						{/* AI Reasoning */}
						<Collapsible>
							<CollapsibleTrigger asChild>
								<Button variant="ghost" size="sm" className="w-full justify-start text-[#6b6760]">
									<ChevronDown className="mr-2 h-4 w-4" />
									View AI Reasoning
								</Button>
							</CollapsibleTrigger>
							<CollapsibleContent>
								<div className="mt-2 rounded-md bg-[#faf9f7] p-3 text-sm">
									<p className="font-medium mb-2 text-[#3d3a32]">Context Analysis:</p>
									<ul className="list-disc list-inside space-y-1 text-[#8a857d]">
										<li>Candidate: {generatedEmail.context.compliance.percentage}% complete ({generatedEmail.context.candidate.daysInOnboarding} days in onboarding)</li>
										{generatedEmail.context.compliance.blockedByCandidate.length > 0 && (
											<li>Blocked by candidate: {generatedEmail.context.compliance.blockedByCandidate.join(", ")}</li>
										)}
										{generatedEmail.context.compliance.blockedByAdmin.length > 0 && (
											<li>Under review: {generatedEmail.context.compliance.blockedByAdmin.join(", ")}</li>
										)}
										{generatedEmail.context.compliance.blockedByThirdParty.length > 0 && (
											<li>With external providers: {generatedEmail.context.compliance.blockedByThirdParty.join(", ")}</li>
										)}
									</ul>
									<p className="mt-3 text-[#8a857d]">{generatedEmail.context.reasoning}</p>
								</div>
							</CollapsibleContent>
						</Collapsible>

						<div className="flex gap-2 pt-2">
							<Button variant="outline" className="flex-1 border-[#e0dcd4] text-[#3d3a32]">
								Copy to Clipboard
							</Button>
							<Button variant="outline" onClick={() => setGeneratedEmail(null)} className="border-[#e0dcd4] text-[#3d3a32]">
								Close Preview
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Communication History */}
			<div className="space-y-3">
				<h4 className="text-sm font-medium text-[#8a857d]">History</h4>

				{loading && !history.length ? (
					<div className="space-y-3">
						{[1, 2, 3].map((i) => (
							<Card key={i} className="shadow-none! bg-white">
								<CardContent className="py-4">
									<div className="flex items-start gap-3">
										<Skeleton className="h-10 w-10 rounded-full" />
										<div className="flex-1 space-y-2">
											<Skeleton className="h-4 w-3/4" />
											<Skeleton className="h-3 w-1/2" />
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				) : history.length === 0 ? (
					<Card className="shadow-none! bg-white">
						<CardContent className="py-8 text-center">
							<Mail className="mx-auto h-12 w-12 text-[#a8a49c]" />
							<p className="mt-4 text-sm text-[#8a857d]">
								No communications yet. Click "Preview Next Email" to generate the first one.
							</p>
						</CardContent>
					</Card>
				) : (
					history.map((item) => (
						<Card key={item.id} className="shadow-none! bg-white">
							<CardContent className="py-4">
								<div className="flex items-start gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eeedf8]">
										<Mail className="h-5 w-5 text-[#4444cf]" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<p className="font-medium truncate text-[#1c1a15]">{item.subject}</p>
											{item.status === "sent" ? (
												<Badge variant="outline" className="shrink-0 bg-[#edf7f1] text-[#3a9960] border-0">
													<CheckCircle className="mr-1 h-3 w-3" />
													Sent
												</Badge>
											) : (
												<Badge variant="outline" className="shrink-0 border-[#e5e2db] text-[#6b6760]">
													<Clock className="mr-1 h-3 w-3" />
													Preview
												</Badge>
											)}
										</div>
										<p className="text-sm text-[#8a857d] truncate">
											{item.preview}
										</p>
										<p className="mt-1 text-xs text-[#a8a49c]">
											{new Date(item.createdAt).toLocaleString()}
										</p>
									</div>
									<Collapsible
										open={expandedId === item.id}
										onOpenChange={(open) => setExpandedId(open ? item.id : null)}
									>
										<CollapsibleTrigger asChild>
											<Button variant="ghost" size="sm">
												{expandedId === item.id ? (
													<ChevronUp className="h-4 w-4 text-[#a8a49c]" />
												) : (
													<ChevronDown className="h-4 w-4 text-[#a8a49c]" />
												)}
											</Button>
										</CollapsibleTrigger>
									</Collapsible>
								</div>
								{expandedId === item.id && (
									<div className="mt-4 space-y-3">
										{/* Email Body */}
										<div className="rounded-md border border-[#e5e2db] p-4 prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-ul:my-2 prose-li:my-0">
											<Response>{item.body}</Response>
										</div>
										{/* AI Reasoning */}
										{item.reasoning && (
											<Collapsible>
												<CollapsibleTrigger asChild>
													<Button variant="ghost" size="sm" className="w-full justify-start text-[#6b6760]">
														<ChevronDown className="mr-2 h-4 w-4" />
														View AI Reasoning
													</Button>
												</CollapsibleTrigger>
												<CollapsibleContent>
													<div className="mt-2 rounded-md bg-[#faf9f7] p-3 text-sm text-[#8a857d]">
														{item.reasoning}
													</div>
												</CollapsibleContent>
											</Collapsible>
										)}
									</div>
								)}
							</CardContent>
						</Card>
					))
				)}
			</div>
		</div>
	);
}
