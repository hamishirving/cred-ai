import { notFound } from "next/navigation";
import { User, Calendar, Briefcase, Clock, Mail, MapPin, Building2 } from "lucide-react";
import { cookies } from "next/headers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ActivityTimeline } from "@/components/candidate/activity-timeline";
import { CandidateCommunications } from "@/components/candidate/communications";
import { ComplianceChecklist } from "@/components/candidate/compliance-checklist";
import { ShareProfileDialog } from "@/components/candidate/share-profile-dialog";
import { getCandidateContext, getOrganisationSettings } from "@/lib/ai/agents/compliance-companion/queries";
import { getProfileTimeline } from "@/lib/db/queries";

export default async function CandidateDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	// Get organisation ID from cookie (set by org switcher)
	const cookieStore = await cookies();
	const organisationId = cookieStore.get("selectedOrgId")?.value;

	if (!organisationId) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background p-8">
				<p className="text-muted-foreground">Please select an organisation first.</p>
			</div>
		);
	}

	// Get candidate data
	const [candidate, org, timeline] = await Promise.all([
		getCandidateContext(id, organisationId, { includeRecentActivity: false }),
		getOrganisationSettings(organisationId),
		getProfileTimeline({ profileId: id, days: 7 }),
	]);

	if (!candidate) {
		notFound();
	}

	const { compliance } = candidate;
	const latestActivity = timeline.activities[timeline.activities.length - 1];
	const daysSinceLastActivity = latestActivity
		? Math.floor(
				(Date.now() - latestActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24),
			)
		: 999;

	return (
		<div className="flex min-h-full flex-1 flex-col gap-6 bg-background p-8">
			{/* Header with candidate info and overview */}
			<Card className="shadow-none! bg-card">
				<CardContent className="p-4">
					<div className="flex items-start justify-between">
						{/* Left: Avatar and basic info */}
						<div className="flex items-start gap-4">
							<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/12">
								<User className="h-7 w-7 text-primary" />
							</div>
							<div className="space-y-3">
								<div>
									<div className="flex items-center gap-2">
										<h1 className="text-xl font-semibold text-foreground">
											{candidate.firstName} {candidate.lastName}
										</h1>
										{candidate.role && (
											<Badge variant="outline" className="text-xs text-muted-foreground">
												{candidate.role.name}
											</Badge>
										)}
									</div>
									<p className="text-sm text-muted-foreground">{candidate.email}</p>
								</div>
								{/* Overview details inline */}
								<div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
									<div className="flex items-center gap-1.5 text-muted-foreground">
										<Mail className="h-3.5 w-3.5" />
										<span>{candidate.email}</span>
									</div>
									<div className="flex items-center gap-1.5 text-muted-foreground">
										<MapPin className="h-3.5 w-3.5" />
										<span>{candidate.placement?.workNodeName || "Not assigned"}</span>
									</div>
									<div className="flex items-center gap-1.5 text-muted-foreground">
										<Building2 className="h-3.5 w-3.5" />
										<span>{org?.name || "Unknown"}</span>
									</div>
								</div>
							</div>
						</div>
						<ShareProfileDialog profileId={id} />
					</div>

					{/* Quick stats row */}
					<div className="mt-4 grid grid-cols-4 gap-4 border-t border-border pt-4">
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4 text-muted-foreground/80" />
							<div>
								<p className="text-xs text-muted-foreground">Days in Onboarding</p>
								<p className="text-sm font-medium text-foreground">{candidate.daysInOnboarding}</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Briefcase className="h-4 w-4 text-muted-foreground/80" />
							<div>
								<p className="text-xs text-muted-foreground">Placement</p>
								<p className="text-sm font-medium text-foreground">{candidate.placement?.workNodeName || "Not assigned"}</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4 text-muted-foreground/80" />
							<div>
								<p className="text-xs text-muted-foreground">Start Date</p>
								<p className="text-sm font-medium text-foreground">
									{candidate.placement?.startDate
										? new Date(candidate.placement.startDate).toLocaleDateString("en-GB", {
												day: "numeric",
												month: "short",
											})
										: "TBC"}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Clock className="h-4 w-4 text-muted-foreground/80" />
							<div>
								<p className="text-xs text-muted-foreground">Last Activity</p>
								<p className="text-sm font-medium text-foreground">
									{daysSinceLastActivity === 0
										? "Today"
										: daysSinceLastActivity === 1
											? "Yesterday"
											: `${daysSinceLastActivity} days ago`}
								</p>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Activity Timeline */}
			<ActivityTimeline data={timeline} profileId={id} />

			{/* Two column layout: Compliance and Communications */}
			<div className="grid gap-6 lg:grid-cols-2 flex-1">
				{/* Left: Compliance */}
				<div className="flex flex-col gap-4">
					<Card className="shadow-none! bg-card">
						<CardHeader className="pb-3">
							<CardTitle className="text-base text-foreground">Compliance Progress</CardTitle>
							<CardDescription className="text-muted-foreground">
								{compliance.completed} of {compliance.total} items complete
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-0">
							<Progress value={compliance.percentage} className="h-2" />
						</CardContent>
					</Card>

					<ComplianceChecklist
						items={compliance.items}
						placement={candidate.placement ? {
							id: candidate.placement.id,
							roleName: candidate.role?.name,
							workNodeName: candidate.placement.workNodeName,
							startDate: candidate.placement.startDate,
						} : undefined}
						showPlacementHeader={false}
						defaultExpanded={["candidate", "admin", "third_party"]}
					/>
				</div>

				{/* Right: Communications */}
				<div className="flex flex-col">
					<CandidateCommunications
						profileId={id}
						organisationId={organisationId}
						candidateName={`${candidate.firstName} ${candidate.lastName}`}
					/>
				</div>
			</div>
		</div>
	);
}
