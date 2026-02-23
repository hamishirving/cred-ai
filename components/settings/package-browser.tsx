"use client";

import { useMemo, useState } from "react";
import {
	ChevronDown,
	ChevronRight,
	Search,
	Shield,
	MapPin,
	Building2,
	AlertTriangle,
	Layers,
	Briefcase,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { PackageData, RoleData } from "./compliance-settings";

// ============================================
// Display config
// ============================================

/** Normalise DB categories to display groups */
function toGroupKey(category: string | null): string {
	if (category === "professional" || category === "specialty") return "role";
	if (category === "screening") return "conditional";
	if (category === "client") return "facility";
	return category || "core";
}

const GROUP_CONFIG: Record<
	string,
	{ label: string; icon: typeof Shield; color: string; bgColor: string }
> = {
	core: {
		label: "Core",
		icon: Shield,
		color: "text-[#4444cf]",
		bgColor: "bg-[#eeedf8]",
	},
	role: {
		label: "Role",
		icon: Briefcase,
		color: "text-[#3a9960]",
		bgColor: "bg-[#eef6f1]",
	},
	jurisdiction: {
		label: "State",
		icon: MapPin,
		color: "text-[#c49332]",
		bgColor: "bg-[#faf5eb]",
	},
	facility: {
		label: "Facility",
		icon: Building2,
		color: "text-[#6b6760]",
		bgColor: "bg-[#f0ede7]",
	},
	conditional: {
		label: "Conditional",
		icon: AlertTriangle,
		color: "text-[#c93d4e]",
		bgColor: "bg-[#fdf0f1]",
	},
};

const ELEMENT_CATEGORY_COLORS: Record<string, string> = {
	identity: "bg-[#4444cf]",
	professional: "bg-[#3a9960]",
	training: "bg-[#c49332]",
	health: "bg-[#c93d4e]",
	orientation: "bg-[#6b6760]",
};

const FILTER_OPTIONS = [
	{ value: "all", label: "All" },
	{ value: "core", label: "Core" },
	{ value: "role", label: "Role" },
	{ value: "jurisdiction", label: "State" },
	{ value: "facility", label: "Facility" },
	{ value: "conditional", label: "Conditional" },
];

const GROUP_ORDER = ["core", "role", "jurisdiction", "facility", "conditional"];

// ============================================
// Component
// ============================================

interface PackageBrowserProps {
	packages: PackageData[];
	roles: RoleData[];
	rolePackageMapping: Record<string, string[]>;
}

export function PackageBrowser({
	packages,
	roles,
	rolePackageMapping,
}: PackageBrowserProps) {
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [expandedPackages, setExpandedPackages] = useState<Set<string>>(
		new Set(),
	);

	// Invert role→packages mapping to package→roles
	const packageRoles = useMemo(() => {
		const map: Record<string, string[]> = {};
		const roleNameBySlug = Object.fromEntries(
			roles.map((r) => [r.slug, r.name]),
		);
		for (const [roleSlug, pkgSlugs] of Object.entries(rolePackageMapping)) {
			for (const pkgSlug of pkgSlugs) {
				if (!map[pkgSlug]) map[pkgSlug] = [];
				const name = roleNameBySlug[roleSlug];
				if (name) map[pkgSlug].push(name);
			}
		}
		return map;
	}, [roles, rolePackageMapping]);

	const filteredPackages = useMemo(() => {
		return packages.filter((pkg) => {
			if (
				search &&
				!pkg.name.toLowerCase().includes(search.toLowerCase()) &&
				!pkg.slug.toLowerCase().includes(search.toLowerCase())
			) {
				return false;
			}
			if (typeFilter === "all") return true;
			return toGroupKey(pkg.category) === typeFilter;
		});
	}, [packages, search, typeFilter]);

	// Group by normalised display key
	const grouped = useMemo(() => {
		const groups: Record<string, PackageData[]> = {};
		for (const pkg of filteredPackages) {
			const key = toGroupKey(pkg.category);
			if (!groups[key]) groups[key] = [];
			groups[key].push(pkg);
		}
		return groups;
	}, [filteredPackages]);

	const togglePackage = (id: string) => {
		setExpandedPackages((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	return (
		<div className="flex flex-col gap-4">
			{/* Filter bar */}
			<div className="flex items-center gap-3 flex-wrap">
				<div className="relative flex-1 min-w-[200px] max-w-sm">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						placeholder="Search packages…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-8 h-8 text-sm"
					/>
				</div>
				<div className="flex items-center gap-1.5">
					{FILTER_OPTIONS.map((opt) => (
						<Button
							key={opt.value}
							variant={typeFilter === opt.value ? "default" : "outline"}
							size="sm"
							className="h-7 text-xs px-2.5"
							onClick={() => setTypeFilter(opt.value)}
						>
							{opt.label}
						</Button>
					))}
				</div>
			</div>

			{/* Package count */}
			<p className="text-xs text-muted-foreground">
				{filteredPackages.length} package
				{filteredPackages.length !== 1 ? "s" : ""}
				{typeFilter !== "all" || search ? " matching filters" : ""}
			</p>

			{/* Grouped list */}
			<div className="flex flex-col gap-6">
				{GROUP_ORDER.filter((key) => grouped[key]?.length).map((key) => {
					const config = GROUP_CONFIG[key] || GROUP_CONFIG.core;
					const Icon = config.icon;

					return (
						<div key={key} className="flex flex-col gap-2">
							{/* Group header */}
							<div className="flex items-center gap-2">
								<Icon className={cn("h-4 w-4", config.color)} />
								<h3 className="text-sm font-medium">
									{config.label} Packages
								</h3>
								<Badge
									variant="secondary"
									className="text-[10px] px-1.5 py-0 h-4"
								>
									{grouped[key].length}
								</Badge>
							</div>

							{/* Package cards */}
							<div className="flex flex-col gap-1.5">
								{grouped[key].map((pkg) => (
									<PackageCard
										key={pkg.id}
										pkg={pkg}
										expanded={expandedPackages.has(pkg.id)}
										onToggle={() => togglePackage(pkg.id)}
										groupConfig={config}
										usedByRoles={packageRoles[pkg.slug]}
									/>
								))}
							</div>
						</div>
					);
				})}
			</div>

			{filteredPackages.length === 0 && (
				<div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
					<Layers className="h-8 w-8 mb-2 opacity-50" />
					<p className="text-sm">No packages match your filters</p>
				</div>
			)}
		</div>
	);
}

// ============================================
// Package Card
// ============================================

const WHO_PROVIDES: Record<string, string> = {
	candidate: "Candidate",
	placement: "Facility",
};

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
	form: "Form",
	document: "Document",
	check: "Check",
	attestation: "Attestation",
	external: "External",
};

function formatExpiry(days: number | null): string {
	if (!days) return "—";
	if (days >= 365) {
		const years = Math.round(days / 365);
		return `${years}y`;
	}
	return `${days}d`;
}

function PackageCard({
	pkg,
	expanded,
	onToggle,
	groupConfig,
	usedByRoles,
}: {
	pkg: PackageData;
	expanded: boolean;
	onToggle: () => void;
	groupConfig: (typeof GROUP_CONFIG)[string];
	usedByRoles?: string[];
}) {
	const updatedDate = new Date(pkg.updatedAt);
	const formattedDate = updatedDate.toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});

	return (
		<Collapsible open={expanded} onOpenChange={onToggle}>
			<div
				className={cn(
					"rounded-lg border bg-card overflow-hidden",
					expanded && "ring-1 ring-border",
				)}
			>
				<CollapsibleTrigger asChild>
					<button
						type="button"
						className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors duration-150 cursor-pointer"
					>
						{expanded ? (
							<ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
						) : (
							<ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
						)}

						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<span className="text-sm font-medium truncate">
									{pkg.name}
								</span>
								<Badge
									variant="secondary"
									className={cn(
										"text-[10px] px-1.5 py-0 h-4 shrink-0",
										groupConfig.bgColor,
										groupConfig.color,
									)}
								>
									{groupConfig.label}
								</Badge>
								{pkg.onlyJurisdictions?.length ? (
									<Badge
										variant="outline"
										className="text-[10px] px-1.5 py-0 h-4 shrink-0 capitalize"
									>
										{pkg.onlyJurisdictions.join(", ")}
									</Badge>
								) : null}
								{pkg.isDefault && (
									<Badge
										variant="outline"
										className="text-[10px] px-1.5 py-0 h-4 shrink-0 border-[#4444cf]/30 text-[#4444cf]"
									>
										default
									</Badge>
								)}
							</div>
							{usedByRoles && usedByRoles.length > 0 && (
								<div className="flex items-center gap-1 mt-1 flex-wrap">
									{usedByRoles.map((role) => (
										<Badge
											key={role}
											variant="outline"
											className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground"
										>
											{role}
										</Badge>
									))}
								</div>
							)}
						</div>

						<div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
							<span className="tabular-nums">v{pkg.version}</span>
							<span>{formattedDate}</span>
							<span>
								{pkg.elementCount} element
								{pkg.elementCount !== 1 ? "s" : ""}
							</span>
						</div>
					</button>
				</CollapsibleTrigger>

				<CollapsibleContent>
					<div className="border-t">
						{pkg.description && (
							<p className="px-3 py-2 text-xs text-muted-foreground border-b">
								{pkg.description}
							</p>
						)}
						{pkg.elements.length > 0 ? (
							<table className="w-full text-xs">
								<thead>
									<tr className="bg-[#f7f5f0] text-[11px] font-medium text-[#6b6760]">
										<th className="text-left px-3 py-1.5 font-medium">
											Requirement
										</th>
										<th className="text-left px-3 py-1.5 font-medium w-[100px]">
											Evidence
										</th>
										<th className="text-left px-3 py-1.5 font-medium w-[100px]">
											Scope
										</th>
										<th className="text-right px-3 py-1.5 font-medium w-[70px]">
											Expiry
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-border/50">
									{pkg.elements.map((el) => (
										<tr key={el.slug} className="hover:bg-muted/30">
											<td className="px-3 py-1.5">
												<div className="flex items-center gap-2">
													<span
														className={cn(
															"h-2 w-2 rounded-full shrink-0",
															ELEMENT_CATEGORY_COLORS[el.category || ""] ||
																"bg-muted-foreground",
														)}
													/>
													<span className="truncate">{el.name}</span>
													{el.faHandled && (
														<Badge
															variant="secondary"
															className="text-[10px] px-1.5 py-0 h-4 bg-[#eeedf8] text-[#4444cf] shrink-0"
														>
															FA
														</Badge>
													)}
												</div>
											</td>
											<td className="px-3 py-1.5 text-muted-foreground">
												{EVIDENCE_TYPE_LABELS[el.evidenceType] || el.evidenceType}
											</td>
											<td className="px-3 py-1.5 text-muted-foreground">
												{WHO_PROVIDES[el.scope] || el.scope}
											</td>
											<td className="px-3 py-1.5 text-right text-muted-foreground tabular-nums">
												{formatExpiry(el.expiryDays)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						) : (
							<p className="px-3 py-2 text-xs text-muted-foreground">
								No elements configured
							</p>
						)}
					</div>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}
