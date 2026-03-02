"use client";

import {
	ArrowDown,
	ArrowUp,
	CopyPlus,
	Pencil,
	Plus,
	Save,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
	ComplianceElementData,
	PackageData,
	RoleData,
	WorkNodeTypeData,
} from "./compliance-settings";

type ModalMode = "view" | "create" | "edit";

interface PackageDetailModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: ModalMode;
	organisationId: string;
	packageData: PackageData | null;
	roles: RoleData[];
	elements: ComplianceElementData[];
	workNodeTypes: WorkNodeTypeData[];
	jurisdictions: string[];
	onSaved: (pkg: PackageData) => void;
}

export function PackageDetailModal({
	open,
	onOpenChange,
	mode,
	organisationId,
	packageData,
	roles,
	elements,
	workNodeTypes,
	jurisdictions,
	onSaved,
}: PackageDetailModalProps) {
	const [name, setName] = useState("");
	const [slug, setSlug] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("");
	const [isActive, setIsActive] = useState(true);
	const [selectedFilterJurisdictions, setSelectedFilterJurisdictions] =
		useState<string[]>([]);
	const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
	const [assignedRoleIds, setAssignedRoleIds] = useState<string[]>([]);
	const [assignedJurisdictions, setAssignedJurisdictions] = useState<string[]>(
		[],
	);
	const [assignedWorkNodeTypeIds, setAssignedWorkNodeTypeIds] = useState<
		string[]
	>([]);
	const [submitting, setSubmitting] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	const isCreate = mode === "create";
	const isView = mode === "view";
	const isEdit = mode === "edit";
	const isCloneEdit = isEdit && Boolean(packageData?.isDefault);

	useEffect(() => {
		if (!open) return;

		if (packageData && !isCreate) {
			setName(isCloneEdit ? `${packageData.name} (Custom)` : packageData.name);
			setSlug(isCloneEdit ? `${packageData.slug}-custom` : packageData.slug);
			setDescription(packageData.description ?? "");
			setCategory(packageData.category ?? "");
			setIsActive(packageData.isActive);
			setSelectedFilterJurisdictions(packageData.onlyJurisdictions ?? []);
			setSelectedElementIds(packageData.elements.map((el) => el.id));
			setAssignedRoleIds(packageData.assignments.roleIds ?? []);
			setAssignedJurisdictions(packageData.assignments.jurisdictions ?? []);
			setAssignedWorkNodeTypeIds(packageData.assignments.workNodeTypeIds ?? []);
		} else {
			setName("");
			setSlug("");
			setDescription("");
			setCategory("");
			setIsActive(true);
			setSelectedFilterJurisdictions([]);
			setSelectedElementIds([]);
			setAssignedRoleIds([]);
			setAssignedJurisdictions([]);
			setAssignedWorkNodeTypeIds([]);
		}
		setValidationError(null);
	}, [open, packageData, isCreate, isCloneEdit]);

	const elementById = useMemo(
		() => new Map(elements.map((el) => [el.id, el])),
		[elements],
	);

	const selectedElements = selectedElementIds
		.map((id) => elementById.get(id))
		.filter((element): element is ComplianceElementData => Boolean(element));

	function toggleInList(
		value: string,
		values: string[],
		setter: (next: string[]) => void,
	) {
		if (values.includes(value)) {
			setter(values.filter((entry) => entry !== value));
		} else {
			setter([...values, value]);
		}
	}

	function toggleElement(elementId: string) {
		toggleInList(elementId, selectedElementIds, setSelectedElementIds);
	}

	function moveElement(elementId: string, direction: "up" | "down") {
		setSelectedElementIds((prev) => {
			const index = prev.indexOf(elementId);
			if (index === -1) return prev;
			const target = direction === "up" ? index - 1 : index + 1;
			if (target < 0 || target >= prev.length) return prev;
			const copy = [...prev];
			[copy[index], copy[target]] = [copy[target], copy[index]];
			return copy;
		});
	}

	async function handleSave() {
		setValidationError(null);

		if (name.trim().length === 0) {
			setValidationError("Package name is required.");
			return;
		}
		if (selectedElementIds.length === 0) {
			setValidationError("Select at least one requirement element.");
			return;
		}
		if (
			assignedRoleIds.length === 0 &&
			assignedJurisdictions.length === 0 &&
			assignedWorkNodeTypeIds.length === 0
		) {
			setValidationError(
				"Assign at least one role, jurisdiction, or facility type.",
			);
			return;
		}

		const payload = {
			organisationId,
			name: name.trim(),
			slug: slug.trim() || undefined,
			description: description.trim() || null,
			category: category.trim() || null,
			onlyJurisdictions:
				selectedFilterJurisdictions.length > 0
					? selectedFilterJurisdictions
					: null,
			isActive,
			elementIdsOrdered: selectedElementIds,
			assignments: {
				roleIds: assignedRoleIds,
				jurisdictions: assignedJurisdictions,
				workNodeTypeIds: assignedWorkNodeTypeIds,
			},
			cloneFromPackageId: isCloneEdit ? packageData?.id : undefined,
		};

		const url =
			isCreate || isCloneEdit
				? "/api/compliance/packages"
				: `/api/compliance/packages/${packageData?.id}`;
		const method = isCreate || isCloneEdit ? "POST" : "PATCH";

		setSubmitting(true);
		try {
			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			const data = await response.json().catch(() => null);
			if (!response.ok || !data?.package) {
				throw new Error(data?.error || "Failed to save package");
			}

			onSaved(data.package as PackageData);
			toast({
				type: "success",
				description: isCloneEdit
					? "Default package cloned and updated."
					: isCreate
						? "Package created."
						: "Package updated.",
			});
			onOpenChange(false);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to save package";
			setValidationError(message);
			toast({ type: "error", description: message });
		} finally {
			setSubmitting(false);
		}
	}

	const title = isCreate
		? "Create package"
		: isView
			? "Package details"
			: isCloneEdit
				? "Clone and edit package"
				: "Edit package";

	const descriptionText = isCreate
		? "Create a new package and assign where it applies."
		: isView
			? "Review package metadata, requirements, and assignments."
			: isCloneEdit
				? "Defaults are read-only. Saving creates a custom clone."
				: "Update package metadata, requirements, and assignments.";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
				<DialogHeader className="px-6 pt-6 pb-4 border-b">
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{descriptionText}</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto px-6 py-5">
					<div className="space-y-5">
						<div className="grid gap-3 md:grid-cols-2">
							<div className="space-y-1.5">
								<Label>Package name</Label>
								<Input
									value={name}
									onChange={(e) => setName(e.target.value)}
									disabled={isView}
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Slug</Label>
								<Input
									value={slug}
									onChange={(e) => setSlug(e.target.value)}
									disabled={isView}
									placeholder="auto-generated-if-empty"
								/>
							</div>
						</div>

						<div className="grid gap-3 md:grid-cols-2">
							<div className="space-y-1.5">
								<Label>Category</Label>
								<Input
									value={category}
									onChange={(e) => setCategory(e.target.value)}
									disabled={isView}
									placeholder="core / professional / facility..."
								/>
							</div>
							<div className="space-y-1.5">
								<Label>Status</Label>
								<div className="flex items-center gap-2 rounded-md border px-3 py-2">
									<Checkbox
										checked={isActive}
										onCheckedChange={(checked) => setIsActive(checked === true)}
										disabled={isView}
									/>
									<span className="text-sm">
										{isActive ? "Active package" : "Inactive package"}
									</span>
								</div>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label>Description</Label>
							<Textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								disabled={isView}
								rows={3}
							/>
						</div>

						<div className="space-y-2">
							<Label>Package jurisdiction guard (optional)</Label>
							<p className="text-xs text-muted-foreground">
								Restricts where this package can ever apply. This does not
								create assignment rules by itself.
							</p>
							<div className="grid gap-2 md:grid-cols-3">
								{jurisdictions.map((jurisdiction) => (
									<div
										key={jurisdiction}
										className="flex items-center gap-2 text-sm"
									>
										<Checkbox
											checked={selectedFilterJurisdictions.includes(
												jurisdiction,
											)}
											onCheckedChange={() =>
												toggleInList(
													jurisdiction,
													selectedFilterJurisdictions,
													setSelectedFilterJurisdictions,
												)
											}
											disabled={isView}
										/>
										<span className="capitalize">
											{jurisdiction.replace(/-/g, " ")}
										</span>
									</div>
								))}
							</div>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label>Requirements</Label>
								<div className="rounded-md border p-3 max-h-64 overflow-y-auto space-y-1.5">
									{elements.map((element) => (
										<div
											key={element.id}
											className="flex items-center gap-2 text-sm"
										>
											<Checkbox
												checked={selectedElementIds.includes(element.id)}
												onCheckedChange={() => toggleElement(element.id)}
												disabled={isView}
											/>
											<span className="truncate">{element.name}</span>
											<Badge
												variant="outline"
												className="ml-auto text-[10px] capitalize"
											>
												{element.scope}
											</Badge>
										</div>
									))}
								</div>
							</div>

							<div className="space-y-2">
								<Label>Selected order</Label>
								<div className="rounded-md border p-3 max-h-64 overflow-y-auto space-y-2">
									{selectedElements.length === 0 ? (
										<p className="text-sm text-muted-foreground">
											No requirements selected.
										</p>
									) : (
										selectedElements.map((element, index) => (
											<div
												key={element.id}
												className="flex items-center gap-2 rounded border px-2.5 py-1.5"
											>
												<span className="text-xs tabular-nums text-muted-foreground">
													{index + 1}
												</span>
												<span className="text-sm flex-1 truncate">
													{element.name}
												</span>
												{!isView && (
													<div className="flex items-center gap-1">
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="h-7 w-7"
															onClick={() => moveElement(element.id, "up")}
															disabled={index === 0}
														>
															<ArrowUp className="h-3.5 w-3.5" />
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="h-7 w-7"
															onClick={() => moveElement(element.id, "down")}
															disabled={index === selectedElements.length - 1}
														>
															<ArrowDown className="h-3.5 w-3.5" />
														</Button>
														<Button
															type="button"
															variant="ghost"
															size="icon"
															className="h-7 w-7 text-destructive"
															onClick={() => toggleElement(element.id)}
														>
															<X className="h-3.5 w-3.5" />
														</Button>
													</div>
												)}
											</div>
										))
									)}
								</div>
							</div>
						</div>

						<div className="text-xs text-muted-foreground">
							Assignments below create live matching rules for role,
							jurisdiction, and facility type.
						</div>

						<div className="grid gap-4 md:grid-cols-3">
							<div className="space-y-2">
								<Label>Assign to roles</Label>
								<div className="rounded-md border p-3 max-h-52 overflow-y-auto space-y-1.5">
									{roles.map((role) => (
										<div
											key={role.id}
											className="flex items-center gap-2 text-sm"
										>
											<Checkbox
												checked={assignedRoleIds.includes(role.id)}
												onCheckedChange={() =>
													toggleInList(
														role.id,
														assignedRoleIds,
														setAssignedRoleIds,
													)
												}
												disabled={isView}
											/>
											<span>{role.name}</span>
										</div>
									))}
								</div>
							</div>

							<div className="space-y-2">
								<Label>Assign to jurisdictions (rule trigger)</Label>
								<div className="rounded-md border p-3 max-h-52 overflow-y-auto space-y-1.5">
									{jurisdictions.map((jurisdiction) => (
										<div
											key={jurisdiction}
											className="flex items-center gap-2 text-sm"
										>
											<Checkbox
												checked={assignedJurisdictions.includes(jurisdiction)}
												onCheckedChange={() =>
													toggleInList(
														jurisdiction,
														assignedJurisdictions,
														setAssignedJurisdictions,
													)
												}
												disabled={isView}
											/>
											<span className="capitalize">
												{jurisdiction.replace(/-/g, " ")}
											</span>
										</div>
									))}
								</div>
							</div>

							<div className="space-y-2">
								<Label>Assign to facility types</Label>
								<div className="rounded-md border p-3 max-h-52 overflow-y-auto space-y-1.5">
									{workNodeTypes.map((type) => (
										<div
											key={type.id}
											className="flex items-center gap-2 text-sm"
										>
											<Checkbox
												checked={assignedWorkNodeTypeIds.includes(type.id)}
												onCheckedChange={() =>
													toggleInList(
														type.id,
														assignedWorkNodeTypeIds,
														setAssignedWorkNodeTypeIds,
													)
												}
												disabled={isView}
											/>
											<span>{type.name}</span>
										</div>
									))}
								</div>
							</div>
						</div>

						{isView && packageData && (
							<div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
								<div className="flex gap-4 flex-wrap">
									<span>Version: v{packageData.version}</span>
									<span>
										Updated:{" "}
										{new Date(packageData.updatedAt).toLocaleDateString(
											"en-GB",
										)}
									</span>
									<span>Requirements: {packageData.elementCount}</span>
									<span>
										{packageData.isDefault
											? "Default package"
											: "Custom package"}
									</span>
								</div>
							</div>
						)}

						{validationError && (
							<p className="text-sm text-destructive">{validationError}</p>
						)}
					</div>
				</div>

				<DialogFooter className="sticky bottom-0 z-10 border-t bg-background px-6 py-4">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
					{!isView && (
						<Button onClick={handleSave} disabled={submitting}>
							{isCreate ? (
								<>
									<Plus className="h-4 w-4 mr-1.5" />
									Create package
								</>
							) : isCloneEdit ? (
								<>
									<CopyPlus className="h-4 w-4 mr-1.5" />
									Clone and save
								</>
							) : (
								<>
									<Save className="h-4 w-4 mr-1.5" />
									Save changes
								</>
							)}
						</Button>
					)}
					{isView && packageData && !packageData.isDefault && (
						<Button
							type="button"
							variant="secondary"
							onClick={() => {
								onOpenChange(false);
								setTimeout(() => {
									toast({
										type: "success",
										description:
											"Close this dialog and use Edit on the package card to modify.",
									});
								}, 0);
							}}
						>
							<Pencil className="h-4 w-4 mr-1.5" />
							Edit from list
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
