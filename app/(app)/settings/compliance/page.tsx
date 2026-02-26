import { cookies } from "next/headers";
import { ClipboardCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	getCompliancePackagesByOrganisationId,
	getComplianceElementsByOrganisationId,
	getRolesByOrganisationId,
	getOrganisationById,
} from "@/lib/db/queries";
import {
	usPackageContents,
	usRolePackages,
	usStatePackages,
	usFacilityPackages,
} from "@/lib/db/seed/markets/us";
import {
	ukPackageContents,
	ukRolePackages,
	ukJurisdictionPackages,
	ukFacilityPackages,
} from "@/lib/db/seed/markets/uk";
import { ComplianceSettings } from "@/components/settings/compliance-settings";

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

	const [org, packages, elements, orgRoles] = await Promise.all([
		getOrganisationById({ id: organisationId }),
		getCompliancePackagesByOrganisationId({ organisationId }),
		getComplianceElementsByOrganisationId({ organisationId }),
		getRolesByOrganisationId({ organisationId }),
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
	const packageContents = market === "uk" ? ukPackageContents : usPackageContents;
	const rolePackageMapping = market === "uk" ? ukRolePackages : usRolePackages;
	const jurisdictionPackages = market === "uk" ? ukJurisdictionPackages : usStatePackages;
	const facilityPackages = market === "uk" ? ukFacilityPackages : usFacilityPackages;

	// Build package-to-elements mapping from static config + DB data
	const elementsMap = Object.fromEntries(elements.map((e) => [e.slug, e]));

	const packageElementsMap: Record<
		string,
		Array<{
			slug: string;
			name: string;
			category: string | null;
			scope: string;
			evidenceType: string;
			expiryDays: number | null;
			faHandled: boolean;
		}>
	> = {};

	for (const pkg of packages) {
		const elementSlugs = packageContents[pkg.slug] || [];
		packageElementsMap[pkg.slug] = elementSlugs
			.map((slug) => {
				const el = elementsMap[slug];
				if (!el) return null;
				return {
					slug: el.slug,
					name: el.name,
					category: el.category,
					scope: el.scope,
					evidenceType: el.evidenceType,
					expiryDays: el.expiryDays,
					faHandled: el.fulfilmentProvider === "external_provider",
				};
			})
			.filter(Boolean) as Array<{
			slug: string;
			name: string;
			category: string | null;
			scope: string;
			evidenceType: string;
			expiryDays: number | null;
			faHandled: boolean;
		}>;
	}

	// Serialise data for client
	const serialisedPackages = packages.map((p) => ({
		id: p.id,
		name: p.name,
		slug: p.slug,
		description: p.description,
		category: p.category,
		onlyJurisdictions: p.onlyJurisdictions,
		isDefault: p.isDefault,
		version: p.version,
		updatedAt: p.updatedAt.toISOString(),
		elementCount: packageElementsMap[p.slug]?.length ?? 0,
		elements: packageElementsMap[p.slug] ?? [],
	}));

	const serialisedRoles = orgRoles.map((r) => ({
		slug: r.slug,
		name: r.name,
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
						<h1 className="text-2xl font-semibold">
							Compliance Configuration
						</h1>
						<p className="text-muted-foreground">{org.name}</p>
					</div>
				</div>
			</div>

			<ComplianceSettings
				organisationId={organisationId}
				packages={serialisedPackages}
				roles={serialisedRoles}
				jurisdictions={jurisdictions}
				facilityTypes={facilityTypes}
				rolePackageMapping={rolePackageMapping}
			/>
		</div>
	);
}
