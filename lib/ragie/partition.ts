function normalizePartition(partition: string): string {
	const normalized = partition.trim().toLowerCase();

	if (normalized === "uk" || normalized === "gb" || normalized === "default") {
		return "default";
	}

	if (normalized === "us" || normalized === "usa") {
		return "usa";
	}

	return normalized;
}

const DEFAULT_PARTITION = normalizePartition(
	process.env.RAGIE_DEFAULT_PARTITION || "default",
);

const SEEDED_ORG_SLUG_TO_PARTITION: Record<string, string> = {
	"meridian-healthcare": "default",
	"oakwood-care": "default",
	"travelnurse-pro": "usa",
	"lakeside-health": "usa",
};

interface OrganisationLike {
	id?: string | null;
	name?: string | null;
	slug?: string | null;
	description?: string | null;
	settings?: {
		aiCompanion?: {
			timezone?: string | null;
		} | null;
	} | null;
}

function partitionForMarket(market: "uk" | "us"): string {
	return market === "us" ? "usa" : "default";
}

function parsePartitionMapping(raw: string | undefined): Map<string, string> {
	const mappings = new Map<string, string>();

	if (!raw) return mappings;

	for (const entry of raw.split(",")) {
		const [rawKey, rawPartition] = entry.split(":");
		const key = rawKey?.trim();
		const partition = rawPartition ? normalizePartition(rawPartition) : null;

		if (!key || !partition) continue;
		mappings.set(key, partition);
	}

	return mappings;
}

const ORG_ID_TO_PARTITION = parsePartitionMapping(
	process.env.RAGIE_ORG_PARTITION_MAP,
);

const ORG_SLUG_TO_PARTITION = new Map<string, string>(
	Object.entries({
		...SEEDED_ORG_SLUG_TO_PARTITION,
		...Object.fromEntries(
			parsePartitionMapping(process.env.RAGIE_ORG_SLUG_PARTITION_MAP),
		),
	}),
);

function inferPartitionFromOrganisation(organisation: OrganisationLike): string | null {
	const timezone = organisation.settings?.aiCompanion?.timezone
		?.trim()
		.toLowerCase();

	if (timezone === "europe/london") return "default";
	if (timezone?.startsWith("america/")) return "usa";

	const descriptor = [
		organisation.name,
		organisation.slug,
		organisation.description,
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

	if (/\b(usa|united states|us)\b/.test(descriptor)) return "usa";
	if (/\b(uk|united kingdom|england|scotland|wales)\b/.test(descriptor))
		return "default";

	return null;
}

export function resolveRagiePartition({
	organisationId,
	organisation,
	market,
}: {
	organisationId?: string | null;
	organisation?: OrganisationLike | null;
	market?: "uk" | "us" | null;
}): string {
	if (organisationId && ORG_ID_TO_PARTITION.has(organisationId)) {
		return ORG_ID_TO_PARTITION.get(organisationId) || DEFAULT_PARTITION;
	}

	const orgId = organisation?.id || null;
	if (orgId && ORG_ID_TO_PARTITION.has(orgId)) {
		return ORG_ID_TO_PARTITION.get(orgId) || DEFAULT_PARTITION;
	}

	const slug = organisation?.slug?.trim().toLowerCase();
	if (slug && ORG_SLUG_TO_PARTITION.has(slug)) {
		return ORG_SLUG_TO_PARTITION.get(slug) || DEFAULT_PARTITION;
	}

	if (market) {
		return partitionForMarket(market);
	}

	const inferredPartition = organisation
		? inferPartitionFromOrganisation(organisation)
		: null;
	return inferredPartition || DEFAULT_PARTITION;
}
