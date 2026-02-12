import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProfileDto } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

function ComplianceStatusBadge({ status }: { status: string }) {
	const normalized = status.toLowerCase().replace(/_/g, " ");
	const isCompliant = normalized === "compliant";
	const isAwaiting = normalized.includes("awaiting") || normalized.includes("conditional");

	const formatted = status
		.replace(/[_-]/g, " ")
		.toLowerCase()
		.replace(/^\w/, (c) => c.toUpperCase());

	const variant = isCompliant ? "success" : isAwaiting ? "warning" : "danger";

	return (
		<Badge
			variant={variant}
			className={cn("shrink-0 text-xs")}
		>
			{formatted}
		</Badge>
	);
}

function buildFullName(profile: ProfileDto) {
	return [profile.title?.defaultValue, profile.firstName, profile.lastName]
		.filter(Boolean)
		.join(" ");
}

/** e.g. "Contact Details.Home Address" → "Home Address", "Position Details.Contract Type" → "Contract Type" */
function formatFieldLabel(name: string, shortName?: string): string {
	if (shortName && !shortName.includes(".")) return shortName;
	const afterDot = name.split(".").pop()?.trim();
	return afterDot || name;
}

/** Handles composite fields (array of {value}), address objects, and primitives */
function formatFieldValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value !== "object") return String(value);

	// Array of sub-fields: [{name, shortName, value}, ...] — e.g. Home Address from Credentially
	if (Array.isArray(value)) {
		const items = value as Array<{ value?: unknown; shortName?: string }>;
		const addressOrder = [
			"Line 1",
			"Line1",
			"Line 2",
			"Line2",
			"Address Line 1",
			"Address Line 2",
			"City",
			"Town",
			"County",
			"State",
			"Postcode",
			"Postal Code",
			"Zip",
			"Country",
		];
		const byShortName = new Map(items.map((i) => [i.shortName ?? "", i.value]));
		const ordered = addressOrder
			.map((key) => byShortName.get(key))
			.filter((v): v is string => v != null && v !== "" && typeof v !== "object");
		const rest = items
			.filter((i) => !addressOrder.includes(i.shortName ?? ""))
			.map((i) => i.value)
			.filter((v): v is string => v != null && v !== "" && typeof v !== "object");
		const combined = [...ordered, ...rest];
		return combined.length > 0 ? combined.join(", ") : "";
	}

	const obj = value as Record<string, unknown>;
	// Flat address object
	const addressKeys = [
		"line1", "line2", "street", "city", "town", "county", "state",
		"postcode", "zip", "postalCode", "country",
	];
	const parts = addressKeys
		.filter((k) => obj[k] && typeof obj[k] === "string")
		.map((k) => String(obj[k]));
	if (parts.length > 0) return parts.join(", ");
	// Don't stringify internals — skip complex objects
	return "";
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
					<div className="flex items-center justify-between gap-3">
						<h3 className="min-w-0 truncate font-semibold text-base">
							{fullName}
						</h3>
						<ComplianceStatusBadge status={profile.complianceStatus} />
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
								{formatFieldLabel(field.name, field.shortName)}:{" "}
								<span className="font-medium text-foreground">
									{formatFieldValue(field.value)}
								</span>
							</div>
						))}
					</div>

				</div>
			</div>
		</div>
	);
}
