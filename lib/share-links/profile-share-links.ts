import crypto from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { profileShareLinks } from "@/lib/db/schema";

export const DEFAULT_SHARE_LINK_TTL_HOURS = 24 * 7; // 7 days

export type CreateProfileShareLinkInput = {
	profileId: string;
	organisationId: string;
	createdBy?: string;
	expiresAt: Date;
};

export function generateProfileShareToken(): string {
	// 32 random bytes -> 43 char base64url token; unguessable for public links.
	return crypto.randomBytes(32).toString("base64url");
}

export function resolveShareExpiresAt({
	expiresAt,
	ttlHours,
}: {
	expiresAt?: string;
	ttlHours?: number;
}): Date {
	if (expiresAt) {
		const date = new Date(expiresAt);
		if (Number.isNaN(date.getTime())) {
			throw new Error("Invalid expiresAt value");
		}
		return date;
	}

	const ttl =
		ttlHours && ttlHours > 0 ? ttlHours : DEFAULT_SHARE_LINK_TTL_HOURS;
	return new Date(Date.now() + ttl * 60 * 60 * 1000);
}

export async function createProfileShareLink({
	profileId,
	organisationId,
	createdBy,
	expiresAt,
}: CreateProfileShareLinkInput) {
	if (expiresAt.getTime() <= Date.now()) {
		throw new Error("Expiry must be in the future");
	}

	const token = generateProfileShareToken();
	const [record] = await db
		.insert(profileShareLinks)
		.values({
			profileId,
			organisationId,
			createdBy,
			token,
			expiresAt,
		})
		.returning();

	return record;
}

export async function listActiveProfileShareLinks(
	profileId: string,
	organisationId: string,
) {
	return db
		.select()
		.from(profileShareLinks)
		.where(
			and(
				eq(profileShareLinks.profileId, profileId),
				eq(profileShareLinks.organisationId, organisationId),
				isNull(profileShareLinks.revokedAt),
				gt(profileShareLinks.expiresAt, new Date()),
			),
		);
}

export async function getActiveProfileShareLinkByToken(token: string) {
	const [record] = await db
		.select()
		.from(profileShareLinks)
		.where(
			and(
				eq(profileShareLinks.token, token),
				isNull(profileShareLinks.revokedAt),
				gt(profileShareLinks.expiresAt, new Date()),
			),
		);

	return record ?? null;
}

export async function revokeProfileShareLink({
	id,
	organisationId,
}: {
	id: string;
	organisationId: string;
}) {
	const [record] = await db
		.update(profileShareLinks)
		.set({ revokedAt: new Date() })
		.where(
			and(
				eq(profileShareLinks.id, id),
				eq(profileShareLinks.organisationId, organisationId),
				isNull(profileShareLinks.revokedAt),
			),
		)
		.returning();

	return record ?? null;
}

export function buildProfileShareUrl(token: string, baseUrl?: string): string {
	const origin =
		baseUrl ||
		(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim();
	return new URL(`/share/${token}`, origin).toString();
}
