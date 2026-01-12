import { cn } from "@/lib/utils";
import type { ProfileDto } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

function ComplianceStatus({ status }: { status: string }) {
	const normalized = status.toLowerCase().replace(/_/g, " ");
	const isCompliant = normalized === "compliant";
	const isAwaiting = normalized.includes("awaiting") || normalized.includes("conditional");

	// Format: NOT_COMPLIANT -> Not compliant
	const formatted = status
		.replace(/[_-]/g, " ")
		.toLowerCase()
		.replace(/^\w/, (c) => c.toUpperCase());

	return (
		<span
			className={cn(
				"text-sm",
				isCompliant
					? "text-green-600"
					: isAwaiting
						? "text-yellow-600"
						: "text-red-600"
			)}
		>
			{formatted}
		</span>
	);
}

function buildFullName(profile: ProfileDto) {
	return [profile.title?.defaultValue, profile.firstName, profile.lastName]
		.filter(Boolean)
		.join(" ");
}

export function ProfileCard({ profile }: { profile: ProfileDto }) {
	const fullName = buildFullName(profile);

	// Get primary job position (first active one)
	const primaryJob =
		profile.jobs.find((job) => job.status === "Active") || profile.jobs[0];

	// Get interesting custom fields (filter out empty/null and name fields)
	const interestingFields = profile.customProfileFields?.filter(
		(f) => f.value && f.name &&
			!f.name.toLowerCase().includes("first name") &&
			!f.name.toLowerCase().includes("last name") &&
			!f.name.toLowerCase().includes("firstname") &&
			!f.name.toLowerCase().includes("lastname")
	).slice(0, 4); // Show max 4

	return (
		<div className="not-prose my-3 w-fit min-w-80 max-w-2xl rounded-lg border bg-card px-5 py-4 shadow-sm">
			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<h3 className="truncate font-semibold text-base">{fullName}</h3>
						<ComplianceStatus status={profile.complianceStatus} />
					</div>

					{primaryJob?.role?.name && (
						<div className="mt-1 text-muted-foreground text-sm">
							{primaryJob.role.name}
							{primaryJob.status && primaryJob.status !== "Active" && (
								<span className="ml-2 text-xs">({primaryJob.status})</span>
							)}
						</div>
					)}

					<div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
						{profile.birthDate && (
							<div className="text-muted-foreground">
								DOB:{" "}
								<span className="font-medium text-foreground">
									{formatDate(profile.birthDate)}
								</span>
							</div>
						)}

						{primaryJob?.startDate && (
							<div className="text-muted-foreground">
								Start date:{" "}
								<span className="font-medium text-foreground">
									{formatDate(primaryJob.startDate)}
								</span>
							</div>
						)}

						{(profile.gradeName?.name || profile.gradeName?.code) && (
							<div className="text-muted-foreground">
								Grade:{" "}
								<span className="font-medium text-foreground">
									{profile.gradeName?.name || profile.gradeName?.code}
								</span>
							</div>
						)}

						{profile.personnelType?.name && (
							<div className="text-muted-foreground">
								Role:{" "}
								<span className="font-medium text-foreground">
									{profile.personnelType.name}
								</span>
							</div>
						)}

						{profile.medicalSpecialty && (
							<div className="text-muted-foreground">
								Specialty:{" "}
								<span className="font-medium text-foreground">
									{profile.medicalSpecialty}
								</span>
							</div>
						)}

						{interestingFields?.map((field) => (
							<div key={field.shortName || field.name} className="text-muted-foreground">
								{field.name}:{" "}
								<span className="font-medium text-foreground">
									{String(field.value)}
								</span>
							</div>
						))}
					</div>

				</div>
			</div>
		</div>
	);
}
