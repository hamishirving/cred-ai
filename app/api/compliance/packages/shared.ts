import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { compliancePackages } from "@/lib/db/schema";

export const PACKAGE_EDITOR_RULE_PREFIX = "pkg-editor:";

const assignmentsSchema = z.object({
	roleIds: z.array(z.string().uuid()).default([]),
	jurisdictions: z.array(z.string()).default([]),
	workNodeTypeIds: z.array(z.string().uuid()).default([]),
});

export const packageUpsertSchema = z.object({
	organisationId: z.string().uuid(),
	name: z.string().min(1),
	slug: z.string().min(1).optional(),
	description: z.string().nullable().optional(),
	category: z.string().nullable().optional(),
	onlyJurisdictions: z.array(z.string()).nullable().optional(),
	isActive: z.boolean().optional(),
	elementIdsOrdered: z.array(z.string().uuid()).default([]),
	assignments: assignmentsSchema,
	cloneFromPackageId: z.string().uuid().optional(),
});

export type PackageUpsertInput = z.infer<typeof packageUpsertSchema>;
export type PackageAssignmentsInput = z.infer<typeof assignmentsSchema>;

export function toSlug(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function hasAnyAssignments(
	assignments: PackageAssignmentsInput,
): boolean {
	return (
		assignments.roleIds.length > 0 ||
		assignments.jurisdictions.length > 0 ||
		assignments.workNodeTypeIds.length > 0
	);
}

export async function ensureUniquePackageSlug({
	organisationId,
	baseSlug,
	excludePackageId,
}: {
	organisationId: string;
	baseSlug: string;
	excludePackageId?: string;
}): Promise<string> {
	let candidate = baseSlug;
	let index = 2;

	while (true) {
		const whereConditions = [
			eq(compliancePackages.organisationId, organisationId),
			eq(compliancePackages.slug, candidate),
		];
		if (excludePackageId) {
			whereConditions.push(ne(compliancePackages.id, excludePackageId));
		}

		const [existing] = await db
			.select({ id: compliancePackages.id })
			.from(compliancePackages)
			.where(and(...whereConditions))
			.limit(1);

		if (!existing) {
			return candidate;
		}

		candidate = `${baseSlug}-${index}`;
		index += 1;
	}
}

export function buildEditorAssignmentRules({
	organisationId,
	packageId,
	assignments,
}: {
	organisationId: string;
	packageId: string;
	assignments: PackageAssignmentsInput;
}) {
	const rows: Array<{
		organisationId: string;
		packageId: string;
		name: string;
		description: string;
		roleId?: string;
		jurisdictions?: string[];
		workNodeTypeId?: string;
	}> = [];

	for (const roleId of assignments.roleIds) {
		rows.push({
			organisationId,
			packageId,
			name: `${PACKAGE_EDITOR_RULE_PREFIX}role:${roleId}`,
			description: "Managed by compliance package editor (role assignment)",
			roleId,
		});
	}

	for (const jurisdiction of assignments.jurisdictions) {
		rows.push({
			organisationId,
			packageId,
			name: `${PACKAGE_EDITOR_RULE_PREFIX}jurisdiction:${jurisdiction}`,
			description:
				"Managed by compliance package editor (jurisdiction assignment)",
			jurisdictions: [jurisdiction],
		});
	}

	for (const workNodeTypeId of assignments.workNodeTypeIds) {
		rows.push({
			organisationId,
			packageId,
			name: `${PACKAGE_EDITOR_RULE_PREFIX}facility:${workNodeTypeId}`,
			description: "Managed by compliance package editor (facility assignment)",
			workNodeTypeId,
		});
	}

	return rows;
}
