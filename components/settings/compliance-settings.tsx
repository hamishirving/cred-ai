"use client";

import { GitBranch, Package, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageBrowser } from "./package-browser";
import { RequirementBuilder } from "./requirement-builder";
import { RequirementCompiler } from "./requirement-compiler";

export interface PackageData {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	category: string | null;
	onlyJurisdictions: string[] | null;
	isDefault: boolean;
	isActive: boolean;
	version: number;
	updatedAt: string;
	elementCount: number;
	elements: Array<{
		id: string;
		slug: string;
		name: string;
		category: string | null;
		scope: string;
		evidenceType: string;
		expiryDays: number | null;
		faHandled: boolean;
		displayOrder: number;
	}>;
	assignments: {
		roleIds: string[];
		jurisdictions: string[];
		workNodeTypeIds: string[];
	};
}

export interface RoleData {
	id: string;
	slug: string;
	name: string;
}

export interface ComplianceElementData {
	id: string;
	name: string;
	slug: string;
	category: string | null;
	scope: string;
	evidenceType: string;
	expiryDays: number | null;
	faHandled: boolean;
}

export interface WorkNodeTypeData {
	id: string;
	name: string;
	slug: string;
	level: number;
}

interface ComplianceSettingsProps {
	organisationId: string;
	packages: PackageData[];
	roles: RoleData[];
	elements: ComplianceElementData[];
	workNodeTypes: WorkNodeTypeData[];
	jurisdictions: string[];
	facilityTypes: string[];
	rolePackageMapping: Record<string, string[]>;
}

export function ComplianceSettings({
	organisationId,
	packages,
	roles,
	elements,
	workNodeTypes,
	jurisdictions,
	facilityTypes,
	rolePackageMapping,
}: ComplianceSettingsProps) {
	return (
		<Tabs defaultValue="packages" className="flex flex-col gap-4">
			<TabsList className="w-fit bg-secondary">
				<TabsTrigger value="packages" className="gap-1.5">
					<Package className="h-3.5 w-3.5" />
					Packages
				</TabsTrigger>
				<TabsTrigger value="builder" className="gap-1.5">
					<GitBranch className="h-3.5 w-3.5" />
					Requirement Builder
				</TabsTrigger>
				<TabsTrigger value="compiler" className="gap-1.5">
					<Wrench className="h-3.5 w-3.5" />
					Requirement Compiler
				</TabsTrigger>
			</TabsList>

			<TabsContent value="packages" className="mt-0">
				<PackageBrowser
					organisationId={organisationId}
					packages={packages}
					roles={roles}
					elements={elements}
					workNodeTypes={workNodeTypes}
					jurisdictions={jurisdictions}
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

			<TabsContent value="compiler" className="mt-0">
				<RequirementCompiler />
			</TabsContent>
		</Tabs>
	);
}
