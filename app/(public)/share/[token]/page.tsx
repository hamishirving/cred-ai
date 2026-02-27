import { Suspense } from "react";
import {
	Briefcase,
	Calendar,
	Clock,
	Mail,
	MapPin,
	Phone,
	Building2,
	Shield,
	ShieldAlert,
	User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ComplianceChecklist } from "@/components/candidate/compliance-checklist";
import { PrintButton } from "@/components/share/print-button";
import {
	getCandidateContext,
	getOrganisationSettings,
} from "@/lib/ai/agents/compliance-companion/queries";
import {
	getProfileById,
	getReferenceContactsForProfile,
} from "@/lib/db/queries";
import { getActiveProfileShareLinkByToken } from "@/lib/share-links/profile-share-links";

function InvalidLinkState() {
	return (
		<div className="flex min-h-dvh w-full items-center justify-center bg-background p-8">
			<Card className="max-w-xl w-full shadow-none! bg-card">
				<CardContent className="py-12 text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/12">
						<ShieldAlert className="h-6 w-6 text-destructive" />
					</div>
					<h1 className="text-2xl font-semibold text-foreground">
						This share link is invalid or expired
					</h1>
					<p className="mx-auto mt-2 max-w-[45ch] text-sm text-muted-foreground">
						Ask the sender to generate a new profile share link.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}

function formatMonthRange(start?: string | null, end?: string | null): string {
	const fmt = (val: string) => {
		const [year, month] = val.split("-");
		const date = new Date(Number(year), Number(month) - 1);
		return date.toLocaleDateString("en-GB", {
			month: "short",
			year: "numeric",
		});
	};
	if (!start) return "";
	const startStr = fmt(start);
	const endStr = end ? fmt(end) : "Present";
	return `${startStr} \u2013 ${endStr}`;
}

function calcYearsExperience(
	refs: {
		candidateStartDate: string | null;
		candidateEndDate: string | null;
	}[],
): number {
	let totalMonths = 0;
	for (const ref of refs) {
		if (!ref.candidateStartDate) continue;
		const [sY, sM] = ref.candidateStartDate.split("-").map(Number);
		const end = ref.candidateEndDate
			? ref.candidateEndDate.split("-").map(Number)
			: [new Date().getFullYear(), new Date().getMonth() + 1];
		totalMonths += (end[0] - sY) * 12 + (end[1] - sM);
	}
	return Math.round(totalMonths / 12);
}

function formatDate(date: Date | undefined | null): string {
	if (!date) return "\u2014";
	return new Date(date).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
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

	const [candidate, org, profile, referenceContacts] = await Promise.all([
		getCandidateContext(shareLink.profileId, shareLink.organisationId, {
			includeRecentActivity: false,
		}),
		getOrganisationSettings(shareLink.organisationId),
		getProfileById({ id: shareLink.profileId }),
		getReferenceContactsForProfile({
			profileId: shareLink.profileId,
			organisationId: shareLink.organisationId,
		}),
	]);

	if (!candidate) {
		return <InvalidLinkState />;
	}

	const { compliance } = candidate;
	const yearsExperience = calcYearsExperience(referenceContacts);
	const locationParts = [
		profile?.address?.city,
		profile?.address?.state,
	].filter(Boolean);
	const locationStr =
		locationParts.length > 0 ? locationParts.join(", ") : null;

	return (
		<div className="flex min-h-dvh flex-1 flex-col gap-6 bg-background p-8 print:p-4 print:gap-4">
			{/* Print styles */}
			<style
				dangerouslySetInnerHTML={{
					__html: `
						@media print {
							body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
							.print\\:hidden { display: none !important; }
							* { box-shadow: none !important; }
							.break-inside-avoid { break-inside: avoid; }
						}
					`,
				}}
			/>

			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">
						Candidate Profile
					</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Shared by {org?.name || "Credentially organisation"}
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Badge variant="info" className="print:hidden">
						Shared view
					</Badge>
					<Suspense>
						<PrintButton />
					</Suspense>
				</div>
			</div>

			{/* Candidate header card */}
			<Card className="shadow-none! bg-card break-inside-avoid">
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
											<Badge
												variant="outline"
												className="text-xs text-muted-foreground"
											>
												{candidate.role.name}
											</Badge>
										)}
									</div>
									<p className="text-sm text-muted-foreground">
										{candidate.email}
									</p>
								</div>
								<div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
									<div className="flex items-center gap-1.5 text-muted-foreground">
										<Mail className="h-3.5 w-3.5" />
										<span>{candidate.email}</span>
									</div>
									{profile?.phone && (
										<div className="flex items-center gap-1.5 text-muted-foreground">
											<Phone className="h-3.5 w-3.5" />
											<span>{profile.phone}</span>
										</div>
									)}
									{locationStr && (
										<div className="flex items-center gap-1.5 text-muted-foreground">
											<MapPin className="h-3.5 w-3.5" />
											<span>{locationStr}</span>
										</div>
									)}
									<div className="flex items-center gap-1.5 text-muted-foreground">
										<Building2 className="h-3.5 w-3.5" />
										<span>{org?.name || "Unknown"}</span>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="mt-4 grid grid-cols-4 gap-4 border-t border-border pt-4">
						{profile?.professionalRegistration ? (
							<div className="flex items-center gap-2">
								<Shield className="h-4 w-4 text-muted-foreground/80" />
								<div>
									<p className="text-xs text-muted-foreground">
										Professional Registration
									</p>
									<p className="text-sm font-medium text-foreground">
										{profile.professionalRegistration}
									</p>
								</div>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<Calendar className="h-4 w-4 text-muted-foreground/80" />
								<div>
									<p className="text-xs text-muted-foreground">
										Days in Onboarding
									</p>
									<p className="text-sm font-medium text-foreground">
										{candidate.daysInOnboarding}
									</p>
								</div>
							</div>
						)}
						<div className="flex items-center gap-2">
							<Briefcase className="h-4 w-4 text-muted-foreground/80" />
							<div>
								<p className="text-xs text-muted-foreground">Placement</p>
								<p className="text-sm font-medium text-foreground">
									{candidate.placement?.workNodeName || "Not assigned"}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4 text-muted-foreground/80" />
							<div>
								<p className="text-xs text-muted-foreground">Start Date</p>
								<p className="text-sm font-medium text-foreground">
									{candidate.placement?.startDate
										? new Date(
												candidate.placement.startDate,
											).toLocaleDateString("en-GB", {
												day: "numeric",
												month: "short",
											})
										: "TBC"}
								</p>
							</div>
						</div>
						{yearsExperience > 0 && (
							<div className="flex items-center gap-2">
								<Clock className="h-4 w-4 text-muted-foreground/80" />
								<div>
									<p className="text-xs text-muted-foreground">Experience</p>
									<p className="text-sm font-medium text-foreground">
										~{yearsExperience}{" "}
										{yearsExperience === 1 ? "year" : "years"}
									</p>
								</div>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Compliance section */}
			<div className="flex flex-col gap-4">
				<Card className="shadow-none! bg-card break-inside-avoid">
					<CardHeader className="pb-3">
						<CardTitle className="text-base text-foreground">
							Compliance Progress
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							{compliance.completed} of {compliance.total} items complete
						</p>
					</CardHeader>
					<CardContent className="pt-0">
						<Progress value={compliance.percentage} className="h-2" />
					</CardContent>
				</Card>

				<ComplianceChecklist
					items={compliance.items}
					placement={
						candidate.placement
							? {
									id: candidate.placement.id,
									roleName: candidate.role?.name,
									workNodeName: candidate.placement.workNodeName,
									startDate: candidate.placement.startDate,
								}
							: undefined
					}
					showPlacementHeader={false}
					defaultExpanded={["complete"]}
					readOnly
				/>
			</div>

			{/* Work History & References */}
			{referenceContacts.length > 0 && (
				<Card className="shadow-none! bg-card break-inside-avoid">
					<CardHeader className="pb-3">
						<CardTitle className="text-base text-foreground">
							Work History & References
						</CardTitle>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="divide-y divide-border">
							{referenceContacts.map((ref) => (
								<div key={ref.id} className="py-3 first:pt-0 last:pb-0">
									<div className="flex items-start justify-between">
										<div>
											<p className="text-sm font-medium text-foreground">
												{ref.candidateJobTitle || "Role not specified"}
											</p>
											<p className="text-sm text-muted-foreground">
												{ref.refereeOrganisation}
											</p>
											{(ref.candidateStartDate || ref.candidateEndDate) && (
												<p className="mt-0.5 text-xs text-muted-foreground">
													{formatMonthRange(
														ref.candidateStartDate,
														ref.candidateEndDate,
													)}
												</p>
											)}
										</div>
										<div className="text-right shrink-0">
											<Badge
												variant={
													ref.status === "completed"
														? "success"
														: ref.status === "contacted"
															? "info"
															: "neutral"
												}
												className="text-xs"
											>
												{ref.status === "completed"
													? "Verified"
													: ref.status === "contacted"
														? "In progress"
														: "Pending"}
											</Badge>
											<p className="mt-1 text-xs text-muted-foreground">
												Ref: {ref.refereeName}
											</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
