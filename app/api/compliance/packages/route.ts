import { eq } from "drizzle-orm";
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
	hasAnyAssignments,
	packageUpsertSchema,
	toSlug,
} from "./shared";

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

export async function GET(request: NextRequest) {
	try {
		const organisationId = request.nextUrl.searchParams.get("organisationId");
		if (!organisationId) {
			return NextResponse.json(
				{ error: "organisationId is required" },
				{ status: 400 },
			);
		}

		const packages = await getCompliancePackagesWithDetailsByOrganisationId({
			organisationId,
		});
		return NextResponse.json({ packages });
	} catch (error) {
		console.error("Failed to list compliance packages:", error);
		return NextResponse.json(
			{ error: "Failed to list compliance packages" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const parsed = packageUpsertSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid payload", details: parsed.error.flatten() },
				{ status: 400 },
			);
		}

		const input = parsed.data;

		if (input.elementIdsOrdered.length === 0) {
			return NextResponse.json(
				{ error: "At least one requirement element is required" },
				{ status: 400 },
			);
		}

		if (!hasAnyAssignments(input.assignments)) {
			return NextResponse.json(
				{ error: "At least one assignment target is required" },
				{ status: 400 },
			);
		}

		const cloneSource = input.cloneFromPackageId
			? ((
					await db
						.select()
						.from(compliancePackages)
						.where(eq(compliancePackages.id, input.cloneFromPackageId))
						.limit(1)
				)[0] ?? null)
			: null;

		if (input.cloneFromPackageId && !cloneSource) {
			return NextResponse.json(
				{ error: "Clone source package not found" },
				{ status: 404 },
			);
		}

		if (cloneSource && cloneSource.organisationId !== input.organisationId) {
			return NextResponse.json(
				{ error: "Clone source package belongs to a different organisation" },
				{ status: 400 },
			);
		}

		const resolvedName = input.name.trim();
		const requestedSlug = input.slug?.trim();
		const baseSlug = toSlug(
			requestedSlug ||
				(input.cloneFromPackageId && cloneSource
					? `${cloneSource.slug}-custom`
					: resolvedName),
		);

		if (!baseSlug) {
			return NextResponse.json(
				{ error: "A valid slug could not be generated" },
				{ status: 400 },
			);
		}

		const uniqueSlug = await ensureUniquePackageSlug({
			organisationId: input.organisationId,
			baseSlug,
		});

		const now = new Date();
		const [created] = await db.transaction(async (tx) => {
			const [createdPackage] = await tx
				.insert(compliancePackages)
				.values({
					organisationId: input.organisationId,
					name: resolvedName,
					slug: uniqueSlug,
					description: input.description ?? null,
					category: input.category ?? null,
					onlyJurisdictions: input.onlyJurisdictions ?? null,
					isDefault: false,
					isActive: input.isActive ?? true,
					version: 1,
					updatedAt: now,
				})
				.returning();

			await tx.insert(packageElements).values(
				input.elementIdsOrdered.map((elementId, index) => ({
					packageId: createdPackage.id,
					elementId,
					isRequired: true,
					displayOrder: index,
				})),
			);

			const assignmentRows = buildEditorAssignmentRules({
				organisationId: input.organisationId,
				packageId: createdPackage.id,
				assignments: input.assignments,
			});
			if (assignmentRows.length > 0) {
				await tx.insert(assignmentRules).values(assignmentRows);
			}

			return [createdPackage] as const;
		});

		const withDetails = await getPackageByIdForOrg({
			organisationId: input.organisationId,
			packageId: created.id,
		});

		return NextResponse.json(
			{
				package: withDetails,
				message: input.cloneFromPackageId
					? "Package cloned and saved"
					: "Package created",
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("Failed to create compliance package:", error);
		return NextResponse.json(
			{ error: "Failed to create compliance package" },
			{ status: 500 },
		);
	}
}
