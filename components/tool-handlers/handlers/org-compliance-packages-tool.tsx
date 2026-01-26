"use client";

import type { CompliancePackageBasicDto } from "@/lib/api/types";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface OrgCompliancePackagesOutput {
	data?: CompliancePackageBasicDto[];
	error?: string;
}

export function OrgCompliancePackagesTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, OrgCompliancePackagesOutput>) {
	// Show loading state while running
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Get Organisation Packages"
				state={state}
				input={input}
			/>
		);
	}

	// Render output directly
	if (output.error) {
		return (
			<div className="text-destructive">Error: {String(output.error)}</div>
		);
	}

	if (output.data && output.data.length > 0) {
		return (
			<div className="not-prose my-4 w-[600px] max-w-full">
				<div className="mb-2 text-muted-foreground text-sm">
					{output.data.length} compliance package
					{output.data.length !== 1 ? "s" : ""} available
				</div>
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Package Name</TableHead>
								<TableHead className="text-center">Requirements</TableHead>
								<TableHead className="text-center">Compliant</TableHead>
								<TableHead>Roles</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{output.data.map((pkg) => {
								const totalAssignments = pkg.totalAllAssignmentCount ?? 0;
								const complianceRate =
									totalAssignments > 0
										? Math.round(
												(pkg.compliantAssignmentCount / totalAssignments) * 100,
											)
										: 0;

								return (
									<TableRow key={pkg.id}>
										<TableCell className="font-medium">{pkg.name}</TableCell>
										<TableCell className="text-center">
											{pkg.totalRequirements}
										</TableCell>
										<TableCell className="text-center">
											<span
												className={cn(
													"tabular-nums",
													complianceRate >= 80
														? "text-green-600"
														: complianceRate >= 50
															? "text-amber-600"
															: "text-muted-foreground",
												)}
											>
												{pkg.compliantAssignmentCount}/{totalAssignments}
											</span>
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{pkg.roles.slice(0, 3).map((role) => (
													<Badge
														key={role.roleId}
														variant="secondary"
														className="text-xs"
													>
														{role.roleName}
													</Badge>
												))}
												{pkg.roles.length > 3 && (
													<Badge variant="outline" className="text-xs">
														+{pkg.roles.length - 3}
													</Badge>
												)}
											</div>
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

	if (output.data && output.data.length === 0) {
		return (
			<div className="text-muted-foreground text-sm">
				No compliance packages found in this organisation.
			</div>
		);
	}

	return null;
}
