import { notFound } from "next/navigation";
import { User, Calendar, Briefcase, Shield } from "lucide-react";
import { cookies } from "next/headers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { CandidateCommunications } from "@/components/candidate/communications";
import { ComplianceChecklist } from "@/components/candidate/compliance-checklist";
import { getCandidateContext, getOrganisationSettings } from "@/lib/ai/agents/compliance-companion/queries";

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
			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
				<p className="text-muted-foreground">Please select an organisation first.</p>
			</div>
		);
	}

	// Get candidate data
	const candidate = await getCandidateContext(id, organisationId);
	const org = await getOrganisationSettings(organisationId);

	if (!candidate) {
		notFound();
	}

	const { compliance } = candidate;

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-4">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
						<User className="h-8 w-8 text-primary" />
					</div>
					<div>
						<h1 className="text-2xl font-semibold">
							{candidate.firstName} {candidate.lastName}
						</h1>
						<p className="text-muted-foreground">{candidate.email}</p>
						{candidate.role && (
							<Badge variant="outline" className="mt-1">
								{candidate.role.name}
							</Badge>
						)}
					</div>
				</div>
				<div className="text-right">
					<div className="flex items-center gap-2">
						<span className="text-3xl font-bold text-primary">{compliance.percentage}%</span>
						<span className="text-sm text-muted-foreground">compliant</span>
					</div>
					<p className="text-sm text-muted-foreground">
						{compliance.completed} of {compliance.total} items
					</p>
				</div>
			</div>

			{/* Quick Stats */}
			<div className="grid gap-4 md:grid-cols-4">
				<Card>
					<CardContent className="flex items-center gap-3 py-4">
						<Calendar className="h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm text-muted-foreground">Days in Onboarding</p>
							<p className="text-lg font-semibold">{candidate.daysInOnboarding}</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 py-4">
						<Briefcase className="h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm text-muted-foreground">Placement</p>
							<p className="text-lg font-semibold">
								{candidate.placement?.workNodeName || "Not assigned"}
							</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 py-4">
						<Calendar className="h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm text-muted-foreground">Start Date</p>
							<p className="text-lg font-semibold">
								{candidate.placement?.startDate
									? new Date(candidate.placement.startDate).toLocaleDateString("en-GB", {
											day: "numeric",
											month: "short",
										})
									: "TBC"}
							</p>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="flex items-center gap-3 py-4">
						<Shield className="h-5 w-5 text-muted-foreground" />
						<div>
							<p className="text-sm text-muted-foreground">Last Activity</p>
							<p className="text-lg font-semibold">
								{candidate.daysSinceLastActivity === 0
									? "Today"
									: candidate.daysSinceLastActivity === 1
										? "Yesterday"
										: `${candidate.daysSinceLastActivity} days ago`}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Tabs */}
			<Tabs defaultValue="communications" className="flex-1">
				<TabsList>
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="compliance">Compliance</TabsTrigger>
					<TabsTrigger value="communications">Communications</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Candidate Overview</CardTitle>
							<CardDescription>Key information about this candidate</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<p className="text-sm font-medium text-muted-foreground">Email</p>
									<p>{candidate.email}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground">Role</p>
									<p>{candidate.role?.name || "Not specified"}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground">Location</p>
									<p>{candidate.placement?.workNodeName || "Not assigned"}</p>
								</div>
								<div>
									<p className="text-sm font-medium text-muted-foreground">Organisation</p>
									<p>{org?.name || "Unknown"}</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="compliance" className="mt-6 space-y-4">
					{/* Progress summary */}
					<Card>
						<CardHeader>
							<CardTitle>Compliance Progress</CardTitle>
							<CardDescription>
								{compliance.completed} of {compliance.total} items complete
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Progress value={compliance.percentage} className="h-3" />
						</CardContent>
					</Card>

					{/* Compliance checklist grouped by blocker */}
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
				</TabsContent>

				<TabsContent value="communications" className="mt-6">
					<CandidateCommunications
						profileId={id}
						organisationId={organisationId}
						candidateName={`${candidate.firstName} ${candidate.lastName}`}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
