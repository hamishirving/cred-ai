import { Calendar, Briefcase, Clock, Mail, MapPin, Building2, ShieldAlert, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ActivityTimeline } from "@/components/candidate/activity-timeline";
import { ComplianceChecklist } from "@/components/candidate/compliance-checklist";
import { getCandidateContext, getOrganisationSettings } from "@/lib/ai/agents/compliance-companion/queries";
import { getProfileTimeline } from "@/lib/db/queries";
import { getActiveProfileShareLinkByToken } from "@/lib/share-links/profile-share-links";

function InvalidLinkState() {
	return (
		<div className="flex min-h-dvh w-full items-center justify-center bg-background p-8">
			<Card className="max-w-xl w-full shadow-none! bg-card">
				<CardContent className="py-12 text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/12">
						<ShieldAlert className="h-6 w-6 text-destructive" />
					</div>
					<h1 className="text-2xl font-semibold text-foreground">This share link is invalid or expired</h1>
					<p className="mx-auto mt-2 max-w-[45ch] text-sm text-muted-foreground">
						Ask the sender to generate a new profile share link.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

export default async function SharedProfilePage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;

	const shareLink = await getActiveProfileShareLinkByToken(token);
	if (!shareLink) {
		return <InvalidLinkState />;
	}

	const [candidate, org, timeline] = await Promise.all([
		getCandidateContext(shareLink.profileId, shareLink.organisationId, { includeRecentActivity: false }),
		getOrganisationSettings(shareLink.organisationId),
		getProfileTimeline({ profileId: shareLink.profileId, days: 7 }),
	]);

	if (!candidate) {
		return <InvalidLinkState />;
	}

	const { compliance } = candidate;
	const latestActivity = timeline.activities[timeline.activities.length - 1];
	const daysSinceLastActivity = latestActivity
		? Math.floor(
				(Date.now() - latestActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24),
			)
		: 999;

	return (
		<div className="flex min-h-dvh flex-1 flex-col gap-6 bg-background p-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">
						Candidate Profile
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Shared by {org?.name || "Credentially organisation"}
					</p>
				</div>
				<Badge variant="info">Shared view</Badge>
			</div>

			<Card className="shadow-none! bg-card">
				<CardContent className="p-4">
					<div className="flex items-start justify-between">
						<div className="flex items-start gap-4">
							<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/12">
								<User className="h-7 w-7 text-primary" />
							</div>
							<div className="space-y-3">
								<div>
									<div className="flex items-center gap-2">
										<h2 className="text-xl font-semibold text-foreground">
											{candidate.firstName} {candidate.lastName}
										</h2>
										{candidate.role && (
											<Badge variant="outline" className="text-xs text-muted-foreground">
												{candidate.role.name}
											</Badge>
										)}
									</div>
									<p className="text-sm text-muted-foreground">{candidate.email}</p>
								</div>
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
					</div>

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

			<ActivityTimeline data={timeline} profileId={shareLink.profileId} showViewAllLink={false} />

			<div className="grid gap-6 lg:grid-cols-1">
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
						readOnly
					/>
				</div>
			</div>
		</div>
	);
}
