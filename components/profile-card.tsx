import type { ProfileDto } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

function ComplianceStatusBadge({ status }: { status: string }) {
	const styles: Record<string, { bg: string; text: string }> = {
		compliant: {
			bg: "bg-green-50 dark:bg-green-900/20",
			text: "text-green-700 dark:text-green-400",
		},
		"non-compliant": {
			bg: "bg-red-50 dark:bg-red-900/20",
			text: "text-red-700 dark:text-red-400",
		},
		"conditionally-compliant": {
			bg: "bg-amber-50 dark:bg-amber-900/20",
			text: "text-amber-700 dark:text-amber-400",
		},
		unknown: {
			bg: "bg-gray-50 dark:bg-gray-900/20",
			text: "text-gray-700 dark:text-gray-400",
		},
	};

	const style = styles[status.toLowerCase()] || styles.unknown;

	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium text-xs ${style.bg} ${style.text}`}
		>
			{status.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
		</span>
	);
}

function InfoRow({
	label,
	value,
}: {
	label: string;
	value: string | undefined | null;
}) {
	if (!value) return null;

	return (
		<div className="flex items-start gap-3 py-2">
			<dt className="min-w-[120px] text-muted-foreground text-sm">{label}</dt>
			<dd className="flex-1 font-medium text-sm">{value}</dd>
		</div>
	);
}

export function ProfileCard({ profile }: { profile: ProfileDto }) {
	const fullName = [
		profile.title?.defaultValue,
		profile.firstName,
		profile.lastName,
	]
		.filter(Boolean)
		.join(" ");

	// Get primary job position (first active one)
	const primaryJob =
		profile.jobs.find((job) => job.status === "Active") || profile.jobs[0];

	return (
		<div className="not-prose my-4 w-fit min-w-80 max-w-2xl overflow-hidden rounded-lg border bg-card shadow-sm">
			{/* Header Section */}
			<div className="border-b bg-muted/30 px-6 py-4">
				<div className="flex items-start justify-between gap-4">
					<div className="flex-1">
						<h3 className="mb-1 font-semibold text-xl">{fullName}</h3>
						{primaryJob && (
							<p className="text-muted-foreground text-sm">
								{primaryJob.role.name}
							</p>
						)}
					</div>
					<ComplianceStatusBadge status={profile.complianceStatus} />
				</div>
			</div>

			{/* Main Content - Two Column Layout */}
			<div className="px-6 py-4">
				<dl className="grid grid-cols-1 divide-y md:grid-cols-2 md:gap-x-8 md:divide-y-0">
					<div className="space-y-1">
						<InfoRow
							label="Date of Birth"
							value={
								profile.birthDate ? formatDate(profile.birthDate) : undefined
							}
						/>
						<InfoRow
							label="Grade"
							value={profile.gradeName?.name || profile.gradeName?.code}
						/>
						<InfoRow label="Medical Category" value={profile.medicalCategory} />
					</div>
					<div className="space-y-1">
						<InfoRow label="Gender" value={profile.gender} />
						<InfoRow
							label="Personnel Type"
							value={profile.personnelType?.name}
						/>
						<InfoRow
							label="Medical Specialty"
							value={profile.medicalSpecialty}
						/>
					</div>
				</dl>

				{/* Job Positions */}
				{profile.jobs.length > 0 && (
					<div className="mt-6">
						<h4 className="mb-3 font-semibold text-sm">Job Positions</h4>
						<div className="space-y-2">
							{profile.jobs.map((job) => (
								<div
									key={job.id}
									className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2"
								>
									<div className="flex-1">
										<div className="font-medium text-sm">{job.role.name}</div>
										{job.startDate && (
											<div className="text-muted-foreground text-xs">
												Started {formatDate(job.startDate)}
											</div>
										)}
									</div>
									<div className="flex items-center gap-2">
										<span
											className={`rounded-full px-2 py-0.5 text-xs ${
												job.status === "Active"
													? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
													: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
											}`}
										>
											{job.status}
										</span>
										<ComplianceStatusBadge status={job.complianceStatus} />
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Compliance Tags */}
				{profile.complianceStatusTags.length > 0 && (
					<div className="mt-6">
						<h4 className="mb-3 font-semibold text-sm">Compliance Tags</h4>
						<div className="flex flex-wrap gap-2">
							{profile.complianceStatusTags.map((tag) => (
								<span
									key={tag.key}
									className="rounded-md bg-muted px-2.5 py-1 text-xs"
									title={`${tag.group}: ${tag.name}`}
								>
									{tag.name}
								</span>
							))}
						</div>
					</div>
				)}

				{/* Checklists */}
				{profile.checklists.length > 0 && (
					<div className="mt-6">
						<h4 className="mb-3 font-semibold text-sm">
							Active Checklists ({profile.checklists.length})
						</h4>
						<div className="flex flex-wrap gap-2">
							{profile.checklists.map((checklist) => (
								<span
									key={checklist.id}
									className="rounded-md bg-blue-50 px-2.5 py-1 text-blue-700 text-xs dark:bg-blue-900/30 dark:text-blue-400"
								>
									{checklist.status}
								</span>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
