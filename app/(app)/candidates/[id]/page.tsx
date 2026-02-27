import {
	Briefcase,
	Building2,
	Cake,
	Calendar,
	Clock,
	CreditCard,
	Heart,
	Mail,
	MapPin,
	Phone,
	Shield,
	User,
} from "lucide-react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ComplianceChecklist } from "@/components/candidate/compliance-checklist";
import { ShareProfileDialog } from "@/components/candidate/share-profile-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
	getCandidateContext,
	getOrganisationSettings,
} from "@/lib/ai/agents/compliance-companion/queries";
import {
	getProfileById,
	getReferenceContactsForProfile,
} from "@/lib/db/queries";

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

export default async function CandidateDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const cookieStore = await cookies();
	const organisationId = cookieStore.get("selectedOrgId")?.value;

	if (!organisationId) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 bg-background p-8">
				<p className="text-muted-foreground">
					Please select an organisation first.
				</p>
			</div>
		);
	}

	const [candidate, org, profile, referenceContacts] = await Promise.all([
		getCandidateContext(id, organisationId, {
			includeRecentActivity: false,
		}),
		getOrganisationSettings(organisationId),
		getProfileById({ id }),
		getReferenceContactsForProfile({
			profileId: id,
			organisationId,
		}),
	]);

	if (!candidate) {
		notFound();
	}

	const { compliance } = candidate;
	const yearsExperience = calcYearsExperience(referenceContacts);
	const locationParts = [
		profile?.address?.city,
		profile?.address?.state,
	].filter(Boolean);
	const locationStr =
		locationParts.length > 0 ? locationParts.join(", ") : null;

	const fullAddress = profile?.address
		? [
				profile.address.line1,
				profile.address.line2,
				profile.address.city,
				profile.address.state,
				profile.address.postcode,
				profile.address.country,
			]
				.filter(Boolean)
				.join(", ")
		: null;

	return (
		<div className="flex min-h-full flex-1 flex-col gap-6 bg-background p-8">
			{/* Header card */}
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
										<h1 className="text-xl font-semibold text-foreground">
											{candidate.firstName} {candidate.lastName}
										</h1>
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
						<ShareProfileDialog
							profileId={id}
							organisationId={organisationId}
						/>
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

			{/* Personal Details */}
			{(profile?.dateOfBirth ||
				fullAddress ||
				profile?.nationalId ||
				profile?.emergencyContact) && (
				<Card className="shadow-none! bg-card">
					<CardHeader className="pb-3">
						<CardTitle className="text-base text-foreground">
							Personal Details
						</CardTitle>
					</CardHeader>
					<CardContent className="pt-0">
						<div className="grid grid-cols-2 gap-4">
							{profile?.dateOfBirth && (
								<div className="flex items-center gap-3">
									<Cake className="h-4 w-4 text-muted-foreground/80 shrink-0" />
									<div>
										<p className="text-xs text-muted-foreground">
											Date of Birth
										</p>
										<p className="text-sm font-medium text-foreground">
											{formatDate(profile.dateOfBirth)}
										</p>
									</div>
								</div>
							)}
							{fullAddress && (
								<div className="flex items-center gap-3">
									<MapPin className="h-4 w-4 text-muted-foreground/80 shrink-0" />
									<div>
										<p className="text-xs text-muted-foreground">Address</p>
										<p className="text-sm font-medium text-foreground">
											{fullAddress}
										</p>
									</div>
								</div>
							)}
							{profile?.nationalId && (
								<div className="flex items-center gap-3">
									<CreditCard className="h-4 w-4 text-muted-foreground/80 shrink-0" />
									<div>
										<p className="text-xs text-muted-foreground">National ID</p>
										<p className="text-sm font-medium text-foreground">
											{profile.nationalId}
										</p>
									</div>
								</div>
							)}
							{profile?.emergencyContact && (
								<div className="flex items-center gap-3">
									<Heart className="h-4 w-4 text-muted-foreground/80 shrink-0" />
									<div>
										<p className="text-xs text-muted-foreground">
											Emergency Contact
										</p>
										<p className="text-sm font-medium text-foreground">
											{profile.emergencyContact.name}
											{profile.emergencyContact.relationship &&
												` (${profile.emergencyContact.relationship})`}
										</p>
										{profile.emergencyContact.phone && (
											<p className="text-xs text-muted-foreground">
												{profile.emergencyContact.phone}
											</p>
										)}
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Compliance section */}
			<div className="flex flex-col gap-4">
				<Card className="shadow-none! bg-card">
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
					defaultExpanded={["candidate", "admin", "third_party"]}
				/>
			</div>

			{/* Work History & References */}
			{referenceContacts.length > 0 && (
				<Card className="shadow-none! bg-card">
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
