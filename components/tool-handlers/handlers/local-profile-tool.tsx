"use client";

import {
	Building2,
	Calendar,
	Clock,
	ExternalLink,
	Fingerprint,
	Mail,
	MapPin,
	Phone,
	ShieldCheck,
	User,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ToolLoading } from "../tool-renderer";
import type { ToolHandlerProps } from "../types";

interface Address {
	line1?: string;
	line2?: string;
	city?: string;
	state?: string;
	postcode?: string;
	country?: string;
}

interface Placement {
	id: string;
	workNodeName?: string;
	startDate?: string;
}

interface Role {
	id: string;
	name: string;
}

interface LocalProfileData {
	profileId: string;
	firstName: string;
	lastName: string;
	email: string;
	organisationId: string;
	phone: string | null;
	dateOfBirth: string | null;
	sex: string | null;
	nationalId: string | null;
	address: Address | string | null;
	professionalRegistration: unknown;
	role: Role | string | null;
	placement: Placement | null;
	daysInOnboarding: number | null;
	daysSinceLastActivity: number | null;
}

interface ProfileOutput {
	data?: LocalProfileData;
	error?: string;
}

function formatAddress(addr: Address | string | null): string | null {
	if (!addr) return null;
	if (typeof addr === "string") return addr;
	const parts = [
		addr.line1,
		addr.line2,
		addr.city,
		addr.state,
		addr.postcode,
		addr.country,
	].filter(Boolean);
	return parts.length > 0 ? parts.join(", ") : null;
}

function formatRole(role: Role | string | null): string | null {
	if (!role) return null;
	if (typeof role === "string") return role;
	return role.name || null;
}

function formatRegistration(reg: unknown): string | null {
	if (!reg) return null;
	if (typeof reg === "string") return reg;
	if (typeof reg === "object" && reg !== null && "name" in reg) {
		return String((reg as Record<string, unknown>).name);
	}
	return null;
}

function Field({
	icon,
	value,
	span2,
}: {
	icon: ReactNode;
	value: string;
	span2?: boolean;
}) {
	return (
		<div
			className={`inline-flex items-center gap-1.5 text-muted-foreground ${span2 ? "col-span-2" : ""}`}
		>
			{icon}
			<span className="text-foreground">{value}</span>
		</div>
	);
}

export function LocalProfileTool({
	toolCallId,
	state,
	input,
	output,
}: ToolHandlerProps<unknown, ProfileOutput>) {
	if (!output) {
		return (
			<ToolLoading
				toolCallId={toolCallId}
				toolName="Get Profile"
				state={state}
				input={input}
			/>
		);
	}

	if (output.error) {
		return (
			<div className="text-destructive text-sm">
				Error: {String(output.error)}
			</div>
		);
	}

	const p = output.data;
	if (!p) return null;

	const roleName = formatRole(p.role);
	const addressStr = formatAddress(p.address);
	const regStr = formatRegistration(p.professionalRegistration);

	const activityBadge =
		p.daysSinceLastActivity != null
			? p.daysSinceLastActivity === 0
				? "Active today"
				: `${p.daysSinceLastActivity}d since last activity`
			: null;

	const iconClass = "size-3.5 shrink-0 text-muted-foreground";

	return (
		<div className="not-prose my-3 w-fit min-w-80 max-w-xl rounded-lg border bg-card">
			{/* Header */}
			<div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
				<div>
					<h3 className="font-semibold text-base leading-tight">
						{p.firstName} {p.lastName}
					</h3>
					{roleName && (
						<div className="mt-0.5 text-muted-foreground text-sm">
							{roleName}
						</div>
					)}
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					{p.daysInOnboarding != null && (
						<Badge variant="outline" className="text-xs">
							<Clock className="mr-1 size-3" />
							{p.daysInOnboarding}d onboarding
						</Badge>
					)}
					{activityBadge && (
						<Badge variant="secondary" className="text-xs">
							{activityBadge}
						</Badge>
					)}
				</div>
			</div>

			{/* Details — consistent icon + value on every row */}
			<div className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t px-5 py-3 text-sm">
				<Field icon={<Mail className={iconClass} />} value={p.email} />
				{p.phone && (
					<Field icon={<Phone className={iconClass} />} value={p.phone} />
				)}
				{p.dateOfBirth && (
					<Field
						icon={<Calendar className={iconClass} />}
						value={p.dateOfBirth}
					/>
				)}
				{p.sex && <Field icon={<User className={iconClass} />} value={p.sex} />}
				{p.nationalId && (
					<Field
						icon={<Fingerprint className={iconClass} />}
						value={p.nationalId}
					/>
				)}
				{regStr && (
					<Field icon={<ShieldCheck className={iconClass} />} value={regStr} />
				)}
				{addressStr && (
					<Field
						icon={<MapPin className={iconClass} />}
						value={addressStr}
						span2
					/>
				)}
			</div>

			{/* Placement badge link */}
			{p.placement && (
				<div className="border-t px-5 py-3">
					<Link href={`/placements/${p.placement.id}`}>
						<Badge
							variant="outline"
							className="inline-flex cursor-pointer items-center gap-1.5 text-xs hover:bg-muted"
						>
							<Building2 className="size-3 shrink-0" />
							{p.placement.workNodeName || "View placement"}
							{p.placement.startDate && (
								<span className="text-muted-foreground">
									from{" "}
									{new Date(p.placement.startDate).toLocaleDateString("en-GB", {
										day: "numeric",
										month: "short",
										year: "numeric",
									})}
								</span>
							)}
							<ExternalLink className="size-3 shrink-0 text-muted-foreground" />
						</Badge>
					</Link>
				</div>
			)}
		</div>
	);
}
