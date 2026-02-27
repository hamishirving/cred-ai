import { and, eq, like } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCompliancePackagesWithDetailsByOrganisationId } from "@/lib/db/queries";
import {
	assignmentRules,
	compliancePackages,
	packageElements,
} from "@/lib/db/schema";
import {
	buildEditorAssignmentRules,
	ensureUniquePackageSlug,
	PACKAGE_EDITOR_RULE_PREFIX,
	packageUpsertSchema,
	toSlug,
} from "../shared";

async function getPackageByIdForOrg({
	organisationId,
	packageId,
}: {
	organisationId: string;
	packageId: string;
}) {
	const packages = await getCompliancePackagesWithDetailsByOrganisationId({
		organisationId,
	});
	return packages.find((pkg) => pkg.id === packageId) ?? null;
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const body = await request.json();
		const parsed = packageUpsertSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid payload", details: parsed.error.flatten() },
				{ status: 400 },
			);
		}

		const input = parsed.data;
		const [existing] = await db
			.select()
			.from(compliancePackages)
			.where(eq(compliancePackages.id, id))
			.limit(1);

		if (!existing) {
			return NextResponse.json({ error: "Package not found" }, { status: 404 });
		}

		if (existing.organisationId !== input.organisationId) {
			return NextResponse.json(
				{ error: "Package belongs to a different organisation" },
				{ status: 400 },
			);
		}

		if (existing.isDefault) {
			return NextResponse.json(
				{
					error:
						"Default packages cannot be edited directly. Use clone-and-edit instead.",
				},
				{ status: 400 },
			);
		}

		if (input.cloneFromPackageId) {
			return NextResponse.json(
				{ error: "cloneFromPackageId is not supported for PATCH" },
				{ status: 400 },
			);
		}

		if (input.elementIdsOrdered.length === 0) {
			return NextResponse.json(
				{ error: "At least one requirement element is required" },
				{ status: 400 },
			);
		}

		const baseSlug = toSlug(input.slug?.trim() || existing.slug || input.name);
		if (!baseSlug) {
			return NextResponse.json(
				{ error: "A valid slug could not be generated" },
				{ status: 400 },
			);
		}

		const uniqueSlug = await ensureUniquePackageSlug({
			organisationId: input.organisationId,
			baseSlug,
			excludePackageId: id,
		});

		const now = new Date();
		await db.transaction(async (tx) => {
			await tx
				.update(compliancePackages)
				.set({
					name: input.name.trim(),
					slug: uniqueSlug,
					description: input.description ?? null,
					category: input.category ?? null,
					onlyJurisdictions: input.onlyJurisdictions ?? null,
					isActive: input.isActive ?? existing.isActive,
					version: existing.version + 1,
					updatedAt: now,
				})
				.where(eq(compliancePackages.id, id));

			await tx.delete(packageElements).where(eq(packageElements.packageId, id));
			await tx.insert(packageElements).values(
				input.elementIdsOrdered.map((elementId, index) => ({
					packageId: id,
					elementId,
					isRequired: true,
					displayOrder: index,
				})),
			);

			await tx
				.delete(assignmentRules)
				.where(
					and(
						eq(assignmentRules.packageId, id),
						like(assignmentRules.name, `${PACKAGE_EDITOR_RULE_PREFIX}%`),
					),
				);

			const assignmentRows = buildEditorAssignmentRules({
				organisationId: input.organisationId,
				packageId: id,
				assignments: input.assignments,
			});
			if (assignmentRows.length > 0) {
				await tx.insert(assignmentRules).values(assignmentRows);
			}
		});

		const withDetails = await getPackageByIdForOrg({
			organisationId: input.organisationId,
			packageId: id,
		});

		return NextResponse.json({ package: withDetails });
	} catch (error) {
		console.error("Failed to update compliance package:", error);
		return NextResponse.json(
			{ error: "Failed to update compliance package" },
			{ status: 500 },
		);
	}
}
