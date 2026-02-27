"use client";

import {
	AlertTriangle,
	Briefcase,
	Building2,
	Eye,
	Layers,
	MapPin,
	Pencil,
	Plus,
	Search,
	Shield,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
	ComplianceElementData,
	PackageData,
	RoleData,
	WorkNodeTypeData,
} from "./compliance-settings";
import { PackageDetailModal } from "./package-detail-modal";

type ModalMode = "view" | "create" | "edit";

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

const GROUP_ORDER = ["core", "role", "jurisdiction", "facility", "conditional"];

const FILTER_OPTIONS = [
	{ value: "all", label: "All" },
	{ value: "core", label: "Core" },
	{ value: "role", label: "Role" },
	{ value: "jurisdiction", label: "State" },
	{ value: "facility", label: "Facility" },
	{ value: "conditional", label: "Conditional" },
];

interface PackageBrowserProps {
	organisationId: string;
	packages: PackageData[];
	roles: RoleData[];
	elements: ComplianceElementData[];
	workNodeTypes: WorkNodeTypeData[];
	jurisdictions: string[];
	rolePackageMapping: Record<string, string[]>;
}

export function PackageBrowser({
	organisationId,
	packages,
	roles,
	elements,
	workNodeTypes,
	jurisdictions,
	rolePackageMapping,
}: PackageBrowserProps) {
	const [localPackages, setLocalPackages] = useState<PackageData[]>(packages);
	const [refreshing, setRefreshing] = useState(false);
	const [search, setSearch] = useState("");
	const [typeFilter, setTypeFilter] = useState("all");
	const [modalOpen, setModalOpen] = useState(false);
	const [modalMode, setModalMode] = useState<ModalMode>("view");
	const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
		null,
	);

	useEffect(() => {
		setLocalPackages(packages);
	}, [packages]);

	const selectedPackage = useMemo(
		() => localPackages.find((pkg) => pkg.id === selectedPackageId) ?? null,
		[localPackages, selectedPackageId],
	);

	const roleById = useMemo(
		() => new Map(roles.map((role) => [role.id, role])),
		[roles],
	);
	const roleNameBySlug = useMemo(
		() => new Map(roles.map((role) => [role.slug, role.name])),
		[roles],
	);
	const roleNamesByPackageSlug = useMemo(() => {
		const map = new Map<string, string[]>();
		for (const [roleSlug, packageSlugs] of Object.entries(rolePackageMapping)) {
			const roleName = roleNameBySlug.get(roleSlug);
			if (!roleName) continue;
			for (const packageSlug of packageSlugs) {
				const current = map.get(packageSlug) ?? [];
				if (!current.includes(roleName)) current.push(roleName);
				map.set(packageSlug, current);
			}
		}
		return map;
	}, [roleNameBySlug, rolePackageMapping]);
	const workNodeTypeById = useMemo(
		() => new Map(workNodeTypes.map((type) => [type.id, type])),
		[workNodeTypes],
	);

	const filteredPackages = useMemo(() => {
		return localPackages.filter((pkg) => {
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
	}, [localPackages, search, typeFilter]);

	const grouped = useMemo(() => {
		const groups: Record<string, PackageData[]> = {};
		for (const pkg of filteredPackages) {
			const key = toGroupKey(pkg.category);
			if (!groups[key]) groups[key] = [];
			groups[key].push(pkg);
		}
		return groups;
	}, [filteredPackages]);

	const refreshPackages = useCallback(async () => {
		setRefreshing(true);
		try {
			const response = await fetch(
				`/api/compliance/packages?organisationId=${organisationId}`,
			);
			const data = await response.json().catch(() => null);
			if (!response.ok || !data?.packages) {
				throw new Error(data?.error || "Failed to refresh packages");
			}
			setLocalPackages(data.packages as PackageData[]);
		} catch (error) {
			toast({
				type: "error",
				description:
					error instanceof Error ? error.message : "Failed to refresh packages",
			});
		} finally {
			setRefreshing(false);
		}
	}, [organisationId]);

	const handleSaved = useCallback(
		async (savedPackage: PackageData) => {
			await refreshPackages();
			setSelectedPackageId(savedPackage.id);
		},
		[refreshPackages],
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center gap-3 flex-wrap">
				<div className="relative flex-1 min-w-[240px] max-w-sm">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
					<Input
						placeholder="Search packages..."
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
				<Button
					size="sm"
					className="h-8"
					onClick={() => {
						setModalMode("create");
						setSelectedPackageId(null);
						setModalOpen(true);
					}}
				>
					<Plus className="h-3.5 w-3.5 mr-1.5" />
					New package
				</Button>
			</div>

			<div className="flex items-center justify-between">
				<p className="text-xs text-muted-foreground">
					{filteredPackages.length} package
					{filteredPackages.length !== 1 ? "s" : ""}
					{typeFilter !== "all" || search ? " matching filters" : ""}
				</p>
				<Button
					variant="ghost"
					size="sm"
					className="h-7 text-xs"
					onClick={refreshPackages}
					disabled={refreshing}
				>
					{refreshing ? "Refreshing..." : "Refresh"}
				</Button>
			</div>

			<div className="flex flex-col gap-6">
				{GROUP_ORDER.filter((key) => grouped[key]?.length).map((key) => {
					const config = GROUP_CONFIG[key] || GROUP_CONFIG.core;
					const Icon = config.icon;

					return (
						<div key={key} className="flex flex-col gap-2">
							<div className="flex items-center gap-2">
								<Icon className={cn("h-4 w-4", config.color)} />
								<h3 className="text-sm font-medium">{config.label} Packages</h3>
								<Badge
									variant="secondary"
									className="text-[10px] px-1.5 py-0 h-4"
								>
									{grouped[key].length}
								</Badge>
							</div>

							<div className="flex flex-col gap-2">
								{grouped[key].map((pkg) => {
									const assignedRoleNamesFromRules = pkg.assignments.roleIds
										.map((roleId) => roleById.get(roleId)?.name)
										.filter((name): name is string => Boolean(name));
									const assignedRoleNames =
										assignedRoleNamesFromRules.length > 0
											? assignedRoleNamesFromRules
											: (roleNamesByPackageSlug.get(pkg.slug) ?? []);
									const assignedWorkNodeTypeNames =
										pkg.assignments.workNodeTypeIds
											.map((typeId) => workNodeTypeById.get(typeId)?.name)
											.filter((name): name is string => Boolean(name));

									return (
										<div key={pkg.id} className="rounded-lg border bg-card p-3">
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<div className="flex items-center gap-2 flex-wrap">
														<p className="text-sm font-medium">{pkg.name}</p>
														<Badge
															variant="secondary"
															className={cn(
																"text-[10px] px-1.5 py-0 h-4",
																config.bgColor,
																config.color,
															)}
														>
															{config.label}
														</Badge>
														{pkg.isDefault && (
															<Badge
																variant="outline"
																className="text-[10px] px-1.5 py-0 h-4 border-[#4444cf]/30 text-[#4444cf]"
															>
																default
															</Badge>
														)}
														{!pkg.isActive && (
															<Badge
																variant="outline"
																className="text-[10px] px-1.5 py-0 h-4"
															>
																inactive
															</Badge>
														)}
													</div>
													<p className="text-xs text-muted-foreground mt-1 truncate">
														{pkg.slug}
													</p>
													<div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
														<span>{pkg.elementCount} requirements</span>
														<span>v{pkg.version}</span>
														<span>
															Updated{" "}
															{new Date(pkg.updatedAt).toLocaleDateString(
																"en-GB",
															)}
														</span>
													</div>
												</div>
												<div className="flex items-center gap-1.5 shrink-0">
													<Button
														size="sm"
														variant="outline"
														className="h-7 text-xs"
														onClick={() => {
															setModalMode("view");
															setSelectedPackageId(pkg.id);
															setModalOpen(true);
														}}
													>
														<Eye className="h-3.5 w-3.5 mr-1.5" />
														View
													</Button>
													<Button
														size="sm"
														className="h-7 text-xs"
														onClick={() => {
															setModalMode("edit");
															setSelectedPackageId(pkg.id);
															setModalOpen(true);
														}}
													>
														<Pencil className="h-3.5 w-3.5 mr-1.5" />
														{pkg.isDefault ? "Clone & edit" : "Edit"}
													</Button>
												</div>
											</div>

											<div className="mt-3 flex gap-3 flex-wrap text-xs">
												<div className="rounded-md bg-muted/50 px-2 py-1">
													Roles:{" "}
													{assignedRoleNames.length > 0
														? assignedRoleNames.join(", ")
														: "None"}
												</div>
												<div className="rounded-md bg-muted/50 px-2 py-1 capitalize">
													Jurisdictions:{" "}
													{pkg.assignments.jurisdictions.length > 0
														? pkg.assignments.jurisdictions.join(", ")
														: "None"}
												</div>
												<div className="rounded-md bg-muted/50 px-2 py-1">
													Facilities:{" "}
													{assignedWorkNodeTypeNames.length > 0
														? assignedWorkNodeTypeNames.join(", ")
														: "None"}
												</div>
											</div>
										</div>
									);
								})}
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

			<PackageDetailModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				mode={modalMode}
				organisationId={organisationId}
				packageData={selectedPackage}
				roles={roles}
				elements={elements}
				workNodeTypes={workNodeTypes}
				jurisdictions={jurisdictions}
				onSaved={handleSaved}
			/>
		</div>
	);
}
