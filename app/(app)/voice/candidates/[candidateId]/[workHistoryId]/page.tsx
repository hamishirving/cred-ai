"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
	getCandidateById,
	getWorkHistoryById,
	type WorkHistory,
	type DemoCandidate,
} from "@/data/demo/candidates";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CallStatusBadge } from "@/components/voice/call-status-badge";
import { CallResultsSheet } from "@/components/voice/call-results-sheet";
import { useCallPolling } from "@/hooks/use-call-polling";
import {
	Phone,
	User,
	Building2,
	Calendar,
	Loader2,
	Briefcase,
	Mail,
} from "lucide-react";
import { formatMonthYear } from "@/lib/utils";

interface VerifyPageProps {
	params: Promise<{ candidateId: string; workHistoryId: string }>;
}

export default function VerifyWorkHistoryPage({ params }: VerifyPageProps) {
	const router = useRouter();
	const [candidate, setCandidate] = useState<DemoCandidate | null>(null);
	const [workHistory, setWorkHistory] = useState<WorkHistory | null>(null);
	const [callId, setCallId] = useState<string | null>(null);
	const [showResults, setShowResults] = useState(false);
	const [phoneNumber, setPhoneNumber] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Load data on mount
	useEffect(() => {
		async function loadData() {
			const resolvedParams = await params;
			const cand = getCandidateById(resolvedParams.candidateId);
			if (!cand) {
				router.push("/voice/candidates");
				return;
			}
			setCandidate(cand);

			const work = getWorkHistoryById(
				resolvedParams.candidateId,
				resolvedParams.workHistoryId,
			);
			if (!work || !work.reference) {
				router.push(`/voice/candidates/${resolvedParams.candidateId}`);
				return;
			}
			setWorkHistory(work);
			setPhoneNumber(work.reference.phone);
		}
		loadData();
	}, [params, router]);

	// Poll for call status
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

	// Handle call initiation
	const handleInitiateCall = async () => {
		if (!candidate || !workHistory) return;

		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch("/api/voice/calls", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					templateSlug: "employment-verification",
					phoneNumber,
					recipientName: workHistory.reference?.name,
					context: {
						candidateName: candidate.name,
						jobTitle: workHistory.jobTitle,
						companyName: workHistory.companyName,
						startDate: workHistory.startDate,
						endDate: workHistory.endDate || "",
						employmentType: workHistory.employmentType,
					},
				}),
			});

			const result = await response.json();

			if (result.success && result.call?.id) {
				setCallId(result.call.id);
			} else {
				setError(result.error || "Failed to initiate call");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Network error");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCallAgain = useCallback(() => {
		setCallId(null);
		setShowResults(false);
		setError(null);
	}, []);

	if (!candidate || !workHistory) {
		return (
			<div className="flex items-center justify-center min-h-svh">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const isCallActive = callId && isPolling;
	const isCallEnded = status === "ended";
	const isValidPhone = /^\+[1-9]\d{1,14}$/.test(phoneNumber);

	return (
		<div className="flex flex-1 flex-col gap-4 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Verify Employment</h1>
					<p className="text-muted-foreground text-sm">
						{candidate.name} at {workHistory.companyName}
					</p>
				</div>
				{status && <CallStatusBadge status={status} />}
			</div>

			{/* Two column layout */}
			<div className="grid gap-4 lg:grid-cols-2">
				{/* Left column - Context info */}
				<div className="space-y-4">
					{/* Candidate Info */}
					<Card>
						<CardHeader className="p-4 pb-2">
							<CardTitle className="text-base">Candidate</CardTitle>
						</CardHeader>
						<CardContent className="p-4 pt-0">
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
									<User className="h-5 w-5 text-primary" />
								</div>
								<div>
									<div className="font-medium">{candidate.name}</div>
									<div className="text-sm text-muted-foreground flex items-center gap-1">
										<Mail className="h-3 w-3" />
										{candidate.email}
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Employment Details */}
					<Card>
						<CardHeader className="p-4 pb-2">
							<CardTitle className="text-base">Employment to Verify</CardTitle>
						</CardHeader>
						<CardContent className="p-4 pt-0 space-y-3">
							<div className="flex items-center gap-2 text-sm">
								<Briefcase className="h-4 w-4 text-muted-foreground" />
								<span className="font-medium">{workHistory.jobTitle}</span>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<Building2 className="h-4 w-4 text-muted-foreground" />
								<span>{workHistory.companyName}</span>
							</div>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<Calendar className="h-4 w-4" />
								<span>
									{formatMonthYear(workHistory.startDate)} - {workHistory.endDate ? formatMonthYear(workHistory.endDate) : "Present"}
								</span>
							</div>
							<div className="text-sm">
								<span className="text-muted-foreground">Type: </span>
								<span className="capitalize">{workHistory.employmentType}</span>
							</div>
						</CardContent>
					</Card>

					{/* Reference Contact */}
					<Card>
						<CardHeader className="p-4 pb-2">
							<CardTitle className="text-base">Reference Contact</CardTitle>
							<CardDescription>
								The AI will call this person to verify employment details
							</CardDescription>
						</CardHeader>
						<CardContent className="p-4 pt-0">
							<div className="flex items-center gap-2">
								<Phone className="h-4 w-4 text-green-600" />
								<span className="font-medium">
									{workHistory.reference?.name}
								</span>
							</div>
							<div className="text-sm text-muted-foreground mt-1">
								{workHistory.reference?.title}
							</div>
							<div className="text-sm text-muted-foreground mt-1">
								{workHistory.reference?.phone}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Right column - Call form/status */}
				<div>
					<Card className="h-fit">
						<CardHeader className="p-4 pb-2">
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
						<CardContent className="p-4 pt-0">
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
								<div className="flex items-center justify-center gap-4 py-4">
									<Button onClick={() => setShowResults(true)}>
										View Results
									</Button>
									<Button variant="outline" onClick={handleCallAgain}>
										Call Again
									</Button>
								</div>
							) : (
								<div className="space-y-4">
									<div className="space-y-2">
										<Label htmlFor="phoneNumber">Phone Number</Label>
										<div className="relative">
											<Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
											<Input
												id="phoneNumber"
												type="tel"
												value={phoneNumber}
												onChange={(e) => setPhoneNumber(e.target.value)}
												placeholder="+44..."
												className="pl-10"
											/>
										</div>
										<p className="text-xs text-muted-foreground">
											International format (e.g., +447700900000)
										</p>
									</div>

									{error && (
										<p className="text-sm text-red-600">{error}</p>
									)}

									<Button
										onClick={handleInitiateCall}
										disabled={isSubmitting || !isValidPhone}
										className="w-full"
									>
										{isSubmitting ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Initiating Call...
											</>
										) : (
											<>
												<Phone className="mr-2 h-4 w-4" />
												Start Verification Call
											</>
										)}
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Results Sheet */}
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
