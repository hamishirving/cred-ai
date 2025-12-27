"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
	getCandidateById,
	getWorkHistoryById,
	type WorkHistory,
	type DemoCandidate,
} from "@/data/demo/candidates";
import { getTemplate } from "@/lib/voice";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallForm } from "@/components/voice/call-form";
import { CallStatusBadge } from "@/components/voice/call-status-badge";
import { CallResultsSheet } from "@/components/voice/call-results-sheet";
import { useCallPolling } from "@/hooks/use-call-polling";
import {
	Phone,
	ChevronLeft,
	User,
	Building2,
	Calendar,
	Loader2,
} from "lucide-react";
import type { VoiceTemplate } from "@/lib/voice/types";

interface VerifyPageProps {
	params: Promise<{ candidateId: string; workHistoryId: string }>;
}

export default function VerifyWorkHistoryPage({ params }: VerifyPageProps) {
	const router = useRouter();
	const [candidate, setCandidate] = useState<DemoCandidate | null>(null);
	const [workHistory, setWorkHistory] = useState<WorkHistory | null>(null);
	const [template, setTemplate] = useState<VoiceTemplate | null>(null);
	const [callId, setCallId] = useState<string | null>(null);
	const [showResults, setShowResults] = useState(false);

	// Load data on mount
	useEffect(() => {
		async function loadData() {
			const resolvedParams = await params;
			const cand = getCandidateById(resolvedParams.candidateId);
			if (!cand) {
				router.push("/voice/demo");
				return;
			}
			setCandidate(cand);

			const work = getWorkHistoryById(
				resolvedParams.candidateId,
				resolvedParams.workHistoryId,
			);
			if (!work || !work.reference) {
				router.push(`/voice/demo/${resolvedParams.candidateId}`);
				return;
			}
			setWorkHistory(work);

			const tmpl = getTemplate("employment-verification");
			if (tmpl) setTemplate(tmpl);
		}
		loadData();
	}, [params, router]);

	// Poll for call status - now returns artifact object like voice-ai
	const { status, artifact, isPolling, error: pollingError } = useCallPolling(
		callId,
		{
			enabled: !!callId,
		},
	);

	// Show results when call ends
	useEffect(() => {
		if (status === "ended" && artifact) {
			setShowResults(true);
		}
	}, [status, artifact]);

	// Handle form submission
	const handleSubmit = useCallback(
		async (data: {
			phoneNumber: string;
			recipientName?: string;
			context: Record<string, unknown>;
		}) => {
			try {
				const response = await fetch("/api/voice/calls", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						templateSlug: "employment-verification",
						...data,
					}),
				});

				const result = await response.json();

				if (result.success && result.call?.id) {
					return { success: true, callId: result.call.id };
				}

				return {
					success: false,
					error: result.error || "Failed to initiate call",
				};
			} catch (err) {
				return {
					success: false,
					error: err instanceof Error ? err.message : "Network error",
				};
			}
		},
		[],
	);

	const handleCallInitiated = useCallback((id: string) => {
		setCallId(id);
	}, []);

	const handleCallAgain = useCallback(() => {
		setCallId(null);
		setShowResults(false);
	}, []);

	if (!candidate || !workHistory || !template) {
		return (
			<div className="flex items-center justify-center min-h-svh">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const isCallActive = callId && isPolling;
	const isCallEnded = status === "ended";

	// Prepare context with defaults from work history
	const defaultContext = {
		candidateName: candidate.name,
		jobTitle: workHistory.jobTitle,
		companyName: workHistory.companyName,
		startDate: workHistory.startDate,
		endDate: workHistory.endDate || "",
		employmentType: workHistory.employmentType,
	};

	return (
		<div className="flex flex-col min-h-svh">
			<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href={`/voice/demo/${candidate.id}`}>
						<ChevronLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div className="flex items-center gap-2">
					<Phone className="h-5 w-5" />
					<h1 className="font-semibold">Verify Employment</h1>
				</div>
				{status && (
					<div className="ml-auto">
						<CallStatusBadge status={status} />
					</div>
				)}
			</header>

			<main className="flex-1 p-4 md:p-6">
				<div className="max-w-2xl mx-auto space-y-6">
					{/* Candidate & Work History Summary */}
					<Card>
						<CardHeader className="pb-2">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
									<User className="h-5 w-5 text-primary" />
								</div>
								<div>
									<CardTitle className="text-base">{candidate.name}</CardTitle>
									<CardDescription>{candidate.email}</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="flex items-center gap-2 text-sm">
								<Building2 className="h-4 w-4 text-muted-foreground" />
								<span className="font-medium">{workHistory.jobTitle}</span>
								<span className="text-muted-foreground">at</span>
								<span className="font-medium">{workHistory.companyName}</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Calendar className="h-4 w-4" />
								<span>
									{workHistory.startDate} - {workHistory.endDate || "Present"}
								</span>
							</div>
						</CardContent>
					</Card>

					{/* Reference Contact */}
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-base">Reference Contact</CardTitle>
							<CardDescription>
								The AI will call this person to verify employment details
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4 text-green-600" />
								<span className="font-medium">
									{workHistory.reference?.name}
								</span>
								<span className="text-muted-foreground">
									- {workHistory.reference?.title}
								</span>
							</div>
							<p className="text-sm text-muted-foreground mt-1">
								{workHistory.reference?.phone}
							</p>
						</CardContent>
					</Card>

					{/* Call Form or Status */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">
								{isCallActive
									? "Call In Progress"
									: isCallEnded
										? "Call Completed"
										: "Initiate Verification Call"}
							</CardTitle>
							<CardDescription>
								{isCallActive
									? "The AI is currently making the verification call..."
									: isCallEnded
										? "Review the call results below"
										: "Review the details and click to start the call"}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{isCallActive ? (
								<div className="flex flex-col items-center gap-4 py-8">
									<Loader2 className="h-12 w-12 animate-spin text-primary" />
									<div className="text-center">
										<p className="font-medium">
											{status === "queued"
												? "Connecting..."
												: status === "ringing"
													? "Ringing..."
													: "Call in progress"}
										</p>
										<p className="text-sm text-muted-foreground">
											Calling {workHistory.reference?.name}
										</p>
									</div>
									{pollingError && (
										<p className="text-sm text-red-600">{pollingError}</p>
									)}
								</div>
							) : isCallEnded ? (
								<div className="space-y-4">
									<div className="flex items-center justify-center gap-4">
										<Button onClick={() => setShowResults(true)}>
											View Results
										</Button>
										<Button variant="outline" onClick={handleCallAgain}>
											Call Again
										</Button>
									</div>
								</div>
							) : (
								<CallForm
									template={template}
									defaultValues={defaultContext}
									phoneNumber={workHistory.reference?.phone || ""}
									recipientName={workHistory.reference?.name}
									onSubmit={handleSubmit}
									onCallInitiated={handleCallInitiated}
								/>
							)}
						</CardContent>
					</Card>
				</div>
			</main>

			{/* Results Sheet - matching voice-ai props */}
			<CallResultsSheet
				open={showResults}
				onOpenChange={setShowResults}
				artifact={artifact}
				candidateName={candidate.name}
				workHistoryJobTitle={workHistory.jobTitle}
				workHistoryCompanyName={workHistory.companyName}
				workHistoryStartDate={workHistory.startDate}
				workHistoryEndDate={workHistory.endDate || ""}
				workHistoryEmploymentType={workHistory.employmentType}
			/>
		</div>
	);
}
