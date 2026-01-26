import { cn } from "@/lib/utils";
import type { ProfileDto } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
	CalendarIcon,
	BriefcaseIcon,
	UserIcon,
	CheckCircleIcon,
	XCircleIcon,
	ClockIcon,
} from "lucide-react";

function ComplianceBadge({ status }: { status: string }) {
	const normalized = status.toLowerCase().replace(/_/g, " ");
	const isCompliant = normalized === "compliant";
	const isAwaiting =
		normalized.includes("awaiting") || normalized.includes("conditional");

	const formatted = status
		.replace(/[_-]/g, " ")
		.toLowerCase()
		.replace(/^\w/, (c) => c.toUpperCase());

	const Icon = isCompliant
		? CheckCircleIcon
		: isAwaiting
			? ClockIcon
			: XCircleIcon;

	return (
		<Badge
			variant="outline"
			className={cn(
				"gap-1 font-medium",
				isCompliant
					? "border-green-200 bg-green-50 text-green-700"
					: isAwaiting
						? "border-amber-200 bg-amber-50 text-amber-700"
						: "border-red-200 bg-red-50 text-red-700",
			)}
		>
			<Icon className="size-3" />
			{formatted}
		</Badge>
	);
}

function buildFullName(profile: ProfileDto) {
	return [profile.title?.defaultValue, profile.firstName, profile.lastName]
		.filter(Boolean)
		.join(" ");
}

function getInitials(profile: ProfileDto) {
	const first = profile.firstName?.[0] || "";
	const last = profile.lastName?.[0] || "";
	return (first + last).toUpperCase() || "?";
}

export function ProfileCard({ profile }: { profile: ProfileDto }) {
	const fullName = buildFullName(profile);
	const initials = getInitials(profile);

	// Get primary job position (first active one)
	const primaryJob =
		profile.jobs.find((job) => job.status === "Active") || profile.jobs[0];

	// Get interesting custom fields (filter out empty/null and name fields)
	const interestingFields = profile.customProfileFields
		?.filter(
			(f) =>
				f.value &&
				f.name &&
				!f.name.toLowerCase().includes("first name") &&
				!f.name.toLowerCase().includes("last name") &&
				!f.name.toLowerCase().includes("firstname") &&
				!f.name.toLowerCase().includes("lastname"),
		)
		.slice(0, 3);

	return (
		<div className="not-prose my-3 w-fit min-w-80 max-w-md rounded-lg border bg-card shadow-sm">
			{/* Header */}
			<div className="flex items-center gap-3 border-b px-4 py-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary text-sm">
					{initials}
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="truncate font-semibold text-sm">{fullName}</h3>
					{primaryJob?.role?.name && (
						<p className="truncate text-muted-foreground text-xs">
							{primaryJob.role.name}
						</p>
					)}
				</div>
				<ComplianceBadge status={profile.complianceStatus} />
			</div>

			{/* Details */}
			<div className="space-y-2 px-4 py-3 text-sm">
				{primaryJob?.startDate && (
					<div className="flex items-center gap-2 text-muted-foreground">
						<CalendarIcon className="size-3.5 shrink-0" />
						<span>Started {formatDate(primaryJob.startDate)}</span>
					</div>
				)}

				{profile.personnelType?.name &&
					profile.personnelType.name !== primaryJob?.role?.name && (
						<div className="flex items-center gap-2 text-muted-foreground">
							<BriefcaseIcon className="size-3.5 shrink-0" />
							<span>{profile.personnelType.name}</span>
						</div>
					)}

				{(profile.gradeName?.name || profile.gradeName?.code) && (
					<div className="flex items-center gap-2 text-muted-foreground">
						<UserIcon className="size-3.5 shrink-0" />
						<span>
							Grade: {profile.gradeName?.name || profile.gradeName?.code}
						</span>
					</div>
				)}

				{interestingFields && interestingFields.length > 0 && (
					<div className="flex flex-wrap gap-1.5 pt-1">
						{interestingFields.map((field) => (
							<Badge
								key={field.shortName || field.name}
								variant="secondary"
								className="text-xs"
							>
								{field.name}: {String(field.value)}
							</Badge>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
