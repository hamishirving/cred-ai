"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, GitBranch } from "lucide-react";
import { PackageBrowser } from "./package-browser";
import { RequirementBuilder } from "./requirement-builder";

export interface PackageData {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	category: string | null;
	onlyJurisdictions: string[] | null;
	isDefault: boolean;
	version: number;
	updatedAt: string;
	elementCount: number;
	elements: Array<{
		slug: string;
		name: string;
		category: string | null;
		scope: string;
		evidenceType: string;
		expiryDays: number | null;
		faHandled: boolean;
	}>;
}

export interface RoleData {
	slug: string;
	name: string;
}

interface ComplianceSettingsProps {
	organisationId: string;
	packages: PackageData[];
	roles: RoleData[];
	jurisdictions: string[];
	facilityTypes: string[];
	rolePackageMapping: Record<string, string[]>;
}

export function ComplianceSettings({
	organisationId,
	packages,
	roles,
	jurisdictions,
	facilityTypes,
	rolePackageMapping,
}: ComplianceSettingsProps) {
	return (
		<Tabs defaultValue="packages" className="flex flex-col gap-4">
			<TabsList className="w-fit">
				<TabsTrigger value="packages" className="gap-1.5">
					<Package className="h-3.5 w-3.5" />
					Packages
				</TabsTrigger>
				<TabsTrigger value="builder" className="gap-1.5">
					<GitBranch className="h-3.5 w-3.5" />
					Requirement Builder
				</TabsTrigger>
			</TabsList>

			<TabsContent value="packages" className="mt-0">
				<PackageBrowser
					packages={packages}
					roles={roles}
					rolePackageMapping={rolePackageMapping}
				/>
			</TabsContent>

			<TabsContent value="builder" className="mt-0">
				<RequirementBuilder
					organisationId={organisationId}
					roles={roles}
					jurisdictions={jurisdictions}
					facilityTypes={facilityTypes}
					packages={packages}
					rolePackageMapping={rolePackageMapping}
				/>
			</TabsContent>
		</Tabs>
	);
}
