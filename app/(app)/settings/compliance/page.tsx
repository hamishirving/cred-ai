import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { ComplianceSettings } from "@/components/settings/compliance-settings";
import { Button } from "@/components/ui/button";
import {
	getComplianceElementsByOrganisationId,
	getCompliancePackagesWithDetailsByOrganisationId,
	getOrganisationById,
	getRolesByOrganisationId,
	getWorkNodeTypesByOrganisationId,
} from "@/lib/db/queries";
import {
	ukFacilityPackages,
	ukJurisdictionPackages,
	ukRolePackages,
} from "@/lib/db/seed/markets/uk";
import {
	usFacilityPackages,
	usRolePackages,
	usStatePackages,
} from "@/lib/db/seed/markets/us";

// Known UK package slugs used to detect market
const UK_PACKAGE_SLUGS = new Set([
	"core-package",
	"nursing-package",
	"hca-package",
	"care-worker-package",
	"nhs-trust-package",
	"scotland-package",
	"doctor-package",
	"care-home-package",
]);

function detectMarket(packageSlugs: string[]): "uk" | "us" {
	const ukMatches = packageSlugs.filter((s) => UK_PACKAGE_SLUGS.has(s)).length;
	return ukMatches > 0 ? "uk" : "us";
}

export default async function ComplianceSettingsPage() {
	const cookieStore = await cookies();
	const organisationId = cookieStore.get("selectedOrgId")?.value;

	if (!organisationId) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
				<ClipboardCheck className="h-12 w-12 text-muted-foreground" />
				<h1 className="text-2xl font-semibold">Compliance Configuration</h1>
				<p className="text-muted-foreground text-center max-w-md">
					Please select an organisation first.
				</p>
			</div>
		);
	}

	const [org, packages, elements, orgRoles, orgWorkNodeTypes] =
		await Promise.all([
			getOrganisationById({ id: organisationId }),
			getCompliancePackagesWithDetailsByOrganisationId({ organisationId }),
			getComplianceElementsByOrganisationId({ organisationId }),
			getRolesByOrganisationId({ organisationId }),
			getWorkNodeTypesByOrganisationId({ organisationId }),
		]);

	if (!org) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
				<ClipboardCheck className="h-12 w-12 text-muted-foreground" />
				<h1 className="text-2xl font-semibold">Organisation Not Found</h1>
				<p className="text-muted-foreground text-center max-w-md">
					The selected organisation could not be found.
				</p>
			</div>
		);
	}

	// Detect market from package slugs
	const market = detectMarket(packages.map((p) => p.slug));

	// Select market-specific mappings
	const rolePackageMapping = market === "uk" ? ukRolePackages : usRolePackages;
	const jurisdictionPackages =
		market === "uk" ? ukJurisdictionPackages : usStatePackages;
	const facilityPackages =
		market === "uk" ? ukFacilityPackages : usFacilityPackages;

	// Serialise data for client
	const serialisedPackages = packages.map((p) => ({
		id: p.id,
		name: p.name,
		slug: p.slug,
		description: p.description,
		category: p.category,
		onlyJurisdictions: p.onlyJurisdictions,
		isDefault: p.isDefault,
		isActive: p.isActive,
		version: p.version,
		updatedAt: p.updatedAt.toISOString(),
		elementCount: p.elements.length,
		elements: p.elements.map((element) => ({
			id: element.id,
			slug: element.slug,
			name: element.name,
			category: element.category,
			scope: element.scope,
			evidenceType: element.evidenceType,
			expiryDays: element.expiryDays,
			faHandled: element.faHandled,
			displayOrder: element.displayOrder,
		})),
		assignments: p.assignments,
	}));

	const serialisedRoles = orgRoles.map((r) => ({
		id: r.id,
		slug: r.slug,
		name: r.name,
	}));
	const serialisedElements = elements.map((el) => ({
		id: el.id,
		name: el.name,
		slug: el.slug,
		category: el.category,
		scope: el.scope,
		evidenceType: el.evidenceType,
		expiryDays: el.expiryDays,
		faHandled: el.fulfilmentProvider === "external_provider",
	}));
	const serialisedWorkNodeTypes = orgWorkNodeTypes.map((type) => ({
		id: type.id,
		name: type.name,
		slug: type.slug,
		level: type.level,
	}));

	// Available jurisdictions and facility types from market config
	const jurisdictions = Object.keys(jurisdictionPackages);
	const facilityTypes = Object.keys(facilityPackages);

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link href="/settings">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-3">
					<ClipboardCheck className="h-8 w-8" />
					<div>
						<h1 className="text-2xl font-semibold">Compliance Configuration</h1>
						<p className="text-muted-foreground">{org.name}</p>
					</div>
				</div>
			</div>

			<ComplianceSettings
				organisationId={organisationId}
				packages={serialisedPackages}
				roles={serialisedRoles}
				elements={serialisedElements}
				workNodeTypes={serialisedWorkNodeTypes}
				jurisdictions={jurisdictions}
				facilityTypes={facilityTypes}
				rolePackageMapping={rolePackageMapping}
			/>
		</div>
	);
}
