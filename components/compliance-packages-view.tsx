import { formatDistanceToNow } from "date-fns";
import {
	CheckCircle2,
	XCircle,
	FileText,
	Users,
	Zap,
	MessageSquare,
	ChevronDown,
} from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
	CompliancePackageDto,
	EmployeeComplianceGroupDto,
	EmployeeComplianceRequirementDto,
	ComplianceRequirementType,
} from "@/lib/api/types";

interface CompliancePackagesViewProps {
	packages: CompliancePackageDto[];
}

function getRequirementIcon(type: ComplianceRequirementType) {
	switch (type) {
		case "DOCUMENT_TYPE":
			return FileText;
		case "REFERENCE_FORM":
			return Users;
		case "INTEGRATION":
			return Zap;
		case "TEXT_REQUIREMENT":
			return MessageSquare;
		default:
			return FileText;
	}
}

function getRequirementTypeName(type: ComplianceRequirementType): string {
	switch (type) {
		case "DOCUMENT_TYPE":
			return "Document";
		case "REFERENCE_FORM":
			return "Reference";
		case "INTEGRATION":
			return "Integration";
		case "TEXT_REQUIREMENT":
			return "Text";
		default:
			return type;
	}
}

function getRequirementName(req: EmployeeComplianceRequirementDto): string {
	switch (req.type) {
		case "DOCUMENT_TYPE":
			return req.documentType?.name ?? "Unknown Document";
		case "REFERENCE_FORM":
			return req.referenceForm?.title ?? "Unknown Reference Form";
		case "INTEGRATION":
			return req.integration?.name ?? "Unknown Integration";
		case "TEXT_REQUIREMENT":
			return req.textRequirement?.name ?? "Unknown Requirement";
		default:
			return "Unknown Requirement";
	}
}

function RequirementItem({ req }: { req: EmployeeComplianceRequirementDto }) {
	const Icon = getRequirementIcon(req.type);
	const isCompliant = req.complianceStatus === "COMPLIANT";

	return (
		<div className="flex items-start gap-3 py-2 px-3 rounded-md bg-muted/50">
			<div className="mt-0.5">
				{isCompliant ? (
					<CheckCircle2 className="size-4 text-green-600" />
				) : (
					<XCircle className="size-4 text-red-500" />
				)}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<Icon className="size-4 text-muted-foreground shrink-0" />
					<span className="font-medium text-sm truncate">
						{getRequirementName(req)}
					</span>
					<Badge variant="outline" className="text-xs shrink-0">
						{getRequirementTypeName(req.type)}
					</Badge>
				</div>
				{req.requiredReferencesNumber && req.requiredReferencesNumber > 1 && (
					<p className="text-xs text-muted-foreground mt-1">
						{req.requiredReferencesNumber} references required
					</p>
				)}
				{req.complianceTags && req.complianceTags.length > 0 && (
					<div className="flex flex-wrap gap-1 mt-1.5">
						{req.complianceTags.map((tag) => (
							<Badge
								key={tag.key}
								variant={
									tag.group === "COMPLIANCE_OK" ? "default" : "destructive"
								}
								className="text-xs"
							>
								{tag.name || tag.key}
							</Badge>
						))}
					</div>
				)}
				{req.approved && req.approvedBy && (
					<p className="text-xs text-muted-foreground mt-1">
						Approved by {req.approvedBy.firstName} {req.approvedBy.lastName}{" "}
						{formatDistanceToNow(new Date(req.approved), { addSuffix: true })}
					</p>
				)}
			</div>
		</div>
	);
}

function GroupSection({ group }: { group: EmployeeComplianceGroupDto }) {
	const compliantCount = group.requirements.filter(
		(r) => r.complianceStatus === "COMPLIANT",
	).length;
	const totalCount = group.requirements.length;
	const allCompliant = compliantCount === totalCount;

	return (
		<Collapsible defaultOpen className="border rounded-lg">
			<CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
				<div className="flex items-center gap-2">
					<span className="font-medium">{group.name}</span>
					<Badge
						variant={allCompliant ? "default" : "secondary"}
						className={cn(
							"text-xs",
							allCompliant && "bg-green-600 hover:bg-green-700",
						)}
					>
						{compliantCount}/{totalCount}
					</Badge>
				</div>
				<ChevronDown className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="p-3 pt-0 space-y-2">
					{group.requirements.map((req) => (
						<RequirementItem key={req.id} req={req} />
					))}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

function PackageCard({ pkg }: { pkg: CompliancePackageDto }) {
	const allRequirements = pkg.groups.flatMap((g) => g.requirements);
	const compliantCount = allRequirements.filter(
		(r) => r.complianceStatus === "COMPLIANT",
	).length;
	const totalCount = allRequirements.length;
	const allCompliant = compliantCount === totalCount;
	const percentComplete =
		totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 0;

	return (
		<div className="border rounded-lg overflow-hidden">
			<div className="bg-muted/50 p-4 border-b">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						{allCompliant ? (
							<CheckCircle2 className="size-5 text-green-600" />
						) : (
							<XCircle className="size-5 text-red-500" />
						)}
						<div>
							<h3 className="font-semibold">{pkg.name}</h3>
							<p className="text-sm text-muted-foreground">
								{compliantCount} of {totalCount} requirements complete (
								{percentComplete}%)
							</p>
						</div>
					</div>
					{pkg.modified && (
						<Badge variant="outline" className="text-xs">
							Modified
						</Badge>
					)}
				</div>
				{/* Progress bar */}
				<div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
					<div
						className={cn(
							"h-full transition-all duration-300",
							allCompliant ? "bg-green-600" : "bg-amber-500",
						)}
						style={{ width: `${percentComplete}%` }}
					/>
				</div>
			</div>
			<div className="p-4 space-y-3">
				{pkg.groups.map((group) => (
					<GroupSection key={group.id} group={group} />
				))}
			</div>
		</div>
	);
}

export function CompliancePackagesView({
	packages,
}: CompliancePackagesViewProps) {
	if (packages.length === 0) {
		return (
			<div className="text-sm text-muted-foreground py-4">
				No compliance packages found
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{packages.map((pkg) => (
				<PackageCard key={pkg.id} pkg={pkg} />
			))}
		</div>
	);
}
