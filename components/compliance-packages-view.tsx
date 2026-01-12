import {
	FileText,
	Users,
	Zap,
	MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
	CompliancePackageDto,
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

interface FlattenedRequirement {
	req: EmployeeComplianceRequirementDto;
	packageName: string;
	groupName: string;
}

function flattenPackages(packages: CompliancePackageDto[]): FlattenedRequirement[] {
	const result: FlattenedRequirement[] = [];
	for (const pkg of packages) {
		for (const group of pkg.groups) {
			for (const req of group.requirements) {
				result.push({
					req,
					packageName: pkg.name,
					groupName: group.name,
				});
			}
		}
	}
	return result;
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

	const flattened = flattenPackages(packages);
	const compliantCount = flattened.filter(
		(f) => f.req.complianceStatus === "COMPLIANT"
	).length;
	const totalCount = flattened.length;

	return (
		<div className="w-full space-y-2">
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<span>
					{compliantCount} of {totalCount} requirements compliant
				</span>
				<Badge
					variant={compliantCount === totalCount ? "default" : "secondary"}
					className={cn(
						"text-xs",
						compliantCount === totalCount && "bg-green-600"
					)}
				>
					{Math.round((compliantCount / totalCount) * 100)}%
				</Badge>
			</div>
			<div className="border rounded-lg overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead>Requirement</TableHead>
							<TableHead className="w-24">Type</TableHead>
							<TableHead>Package</TableHead>
							<TableHead>Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{flattened.map((item) => {
							const Icon = getRequirementIcon(item.req.type);
							const isCompliant = item.req.complianceStatus === "COMPLIANT";

							// Format status text: DOCUMENTS_MISSING -> Documents missing
							const formatStatus = (text: string) =>
								text.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

							return (
								<TableRow key={item.req.id}>
									<TableCell className="py-2">
										<div className="flex items-center gap-2">
											<Icon className="size-4 text-muted-foreground shrink-0" />
											<span className="text-sm">{getRequirementName(item.req)}</span>
										</div>
									</TableCell>
									<TableCell className="py-2">
										<Badge variant="outline" className="text-xs">
											{getRequirementTypeName(item.req.type)}
										</Badge>
									</TableCell>
									<TableCell className="py-2">
										<span className="text-sm text-muted-foreground">{item.packageName}</span>
									</TableCell>
									<TableCell className="py-2">
										{item.req.complianceTags && item.req.complianceTags.length > 0 ? (
											<div className="flex flex-wrap gap-1">
												{item.req.complianceTags.map((tag) => {
													const isAwaiting = tag.key?.toLowerCase().includes("awaiting");
													const isOk = tag.group === "COMPLIANCE_OK" && !isAwaiting;
													return (
														<span
															key={tag.key}
															className={cn(
																"text-sm",
																isAwaiting
																	? "text-yellow-600"
																	: isOk
																		? "text-green-600"
																		: "text-red-600"
															)}
														>
															{formatStatus(tag.key)}
														</span>
													);
												})}
											</div>
										) : (
											<span
												className={cn(
													"text-sm",
													isCompliant ? "text-green-600" : "text-red-600"
												)}
											>
												{isCompliant ? "Compliant" : "Not compliant"}
											</span>
										)}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
