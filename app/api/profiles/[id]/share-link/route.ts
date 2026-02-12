import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profileShareLinks, profiles } from "@/lib/db/schema";
import {
	buildProfileShareUrl,
	createProfileShareLink,
	listActiveProfileShareLinks,
	resolveShareExpiresAt,
	revokeProfileShareLink,
} from "@/lib/share-links/profile-share-links";

async function getRequestContext(profileId: string) {
	const session = await auth();
	if (!session?.membership?.organisationId || !session.user.id) {
		return { error: NextResponse.json({ error: "Unauthorised" }, { status: 401 }) };
	}

	const organisationId = session.membership.organisationId;
	const [profile] = await db
		.select({ id: profiles.id })
		.from(profiles)
		.where(and(eq(profiles.id, profileId), eq(profiles.organisationId, organisationId)))
		.limit(1);

	if (!profile) {
		return { error: NextResponse.json({ error: "Profile not found" }, { status: 404 }) };
	}

	return {
		organisationId,
		userId: session.user.id,
	};
}

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: profileId } = await params;
		const context = await getRequestContext(profileId);
		if ("error" in context) return context.error;

		const links = await listActiveProfileShareLinks(profileId, context.organisationId);

		return NextResponse.json({
			links: links.map((link) => ({
				id: link.id,
				url: buildProfileShareUrl(link.token),
				token: link.token,
				expiresAt: link.expiresAt.toISOString(),
				createdAt: link.createdAt.toISOString(),
			})),
		});
	} catch (error) {
		console.error("Failed to list profile share links:", error);
		return NextResponse.json({ error: "Failed to list profile share links" }, { status: 500 });
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: profileId } = await params;
		const context = await getRequestContext(profileId);
		if ("error" in context) return context.error;

		const body = (await request.json()) as { expiresAt?: string; ttlHours?: number };
		const expiresAt = resolveShareExpiresAt({
			expiresAt: body?.expiresAt,
			ttlHours: body?.ttlHours,
		});

		const link = await createProfileShareLink({
			profileId,
			organisationId: context.organisationId,
			createdBy: context.userId,
			expiresAt,
		});

		return NextResponse.json({
			link: {
				id: link.id,
				url: buildProfileShareUrl(link.token),
				token: link.token,
				expiresAt: link.expiresAt.toISOString(),
				createdAt: link.createdAt.toISOString(),
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Failed to create profile share link";
		const status = message.includes("Expiry") || message.includes("expiresAt") ? 400 : 500;
		console.error("Failed to create profile share link:", error);
		return NextResponse.json({ error: message }, { status });
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id: profileId } = await params;
		const context = await getRequestContext(profileId);
		if ("error" in context) return context.error;

		const body = (await request.json()) as { linkId?: string };
		if (!body?.linkId) {
			return NextResponse.json({ error: "linkId is required" }, { status: 400 });
		}

		const [exists] = await db
			.select({ id: profileShareLinks.id })
			.from(profileShareLinks)
			.where(
				and(
					eq(profileShareLinks.id, body.linkId),
					eq(profileShareLinks.profileId, profileId),
					eq(profileShareLinks.organisationId, context.organisationId),
				),
			)
			.limit(1);

		if (!exists) {
			return NextResponse.json({ error: "Share link not found" }, { status: 404 });
		}

		const revoked = await revokeProfileShareLink({
			id: body.linkId,
			organisationId: context.organisationId,
		});

		if (!revoked) {
			return NextResponse.json({ error: "Share link already revoked" }, { status: 400 });
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Failed to revoke profile share link:", error);
		return NextResponse.json({ error: "Failed to revoke profile share link" }, { status: 500 });
	}
}
