"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { ConditionGroup, Condition } from "@/lib/db/schema/agents";

const PROPERTIES = [
	{ value: "userRole", label: "User Role" },
	{ value: "compliancePackage", label: "Compliance Package" },
	{ value: "documentType", label: "Document Type" },
	{ value: "market", label: "Market" },
];

const OPERATORS = [
	{ value: "equals", label: "equals" },
	{ value: "not_equals", label: "does not equal" },
	{ value: "contains", label: "contains" },
	{ value: "in", label: "is one of" },
	{ value: "not_in", label: "is not one of" },
];

interface ConditionBuilderProps {
	groups: ConditionGroup[];
	onChange: (groups: ConditionGroup[]) => void;
}

export function ConditionBuilder({ groups, onChange }: ConditionBuilderProps) {
	function addGroup() {
		onChange([
			...groups,
			{
				operator: "AND",
				conditions: [{ property: "userRole", operator: "equals", value: "" }],
			},
		]);
	}

	function removeGroup(groupIndex: number) {
		onChange(groups.filter((_, i) => i !== groupIndex));
	}

	function addCondition(groupIndex: number) {
		const updated = [...groups];
		updated[groupIndex] = {
			...updated[groupIndex],
			conditions: [
				...updated[groupIndex].conditions,
				{ property: "userRole", operator: "equals", value: "" },
			],
		};
		onChange(updated);
	}

	function removeCondition(groupIndex: number, condIndex: number) {
		const updated = [...groups];
		const conditions = updated[groupIndex].conditions.filter(
			(_, i) => i !== condIndex,
		);
		if (conditions.length === 0) {
			// Remove the entire group if no conditions left
			onChange(groups.filter((_, i) => i !== groupIndex));
		} else {
			updated[groupIndex] = { ...updated[groupIndex], conditions };
			onChange(updated);
		}
	}

	function updateCondition(
		groupIndex: number,
		condIndex: number,
		field: keyof Condition,
		value: string,
	) {
		const updated = [...groups];
		const conditions = [...updated[groupIndex].conditions];
		conditions[condIndex] = { ...conditions[condIndex], [field]: value };
		updated[groupIndex] = { ...updated[groupIndex], conditions };
		onChange(updated);
	}

	if (groups.length === 0) {
		return (
			<div className="flex flex-col gap-2">
				<p className="text-xs text-muted-foreground">No conditions set. Agent runs for all matching triggers.</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="w-fit text-xs"
					onClick={addGroup}
				>
					<Plus className="size-3 mr-1" />
					Add condition group
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{groups.map((group, groupIndex) => (
				<div
					key={groupIndex}
					className="flex flex-col gap-1.5 p-2.5 rounded-md border border-border bg-muted/30"
				>
					{groupIndex > 0 && (
						<div className="flex items-center gap-2 -mt-1 mb-1">
							<div className="h-px flex-1 bg-border" />
							<span className="text-xs font-medium text-muted-foreground px-1">OR</span>
							<div className="h-px flex-1 bg-border" />
						</div>
					)}

					{group.conditions.map((condition, condIndex) => (
						<div key={condIndex} className="flex flex-col gap-1">
							{condIndex > 0 && (
								<span className="text-xs font-medium text-muted-foreground ml-1">
									AND
								</span>
							)}
							<div className="flex items-center gap-1.5">
								<Select
									value={condition.property}
									onValueChange={(v) =>
										updateCondition(groupIndex, condIndex, "property", v)
									}
								>
									<SelectTrigger className="h-7 text-xs w-[140px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{PROPERTIES.map((p) => (
											<SelectItem key={p.value} value={p.value} className="text-xs">
												{p.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								<Select
									value={condition.operator}
									onValueChange={(v) =>
										updateCondition(groupIndex, condIndex, "operator", v)
									}
								>
									<SelectTrigger className="h-7 text-xs w-[130px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{OPERATORS.map((o) => (
											<SelectItem key={o.value} value={o.value} className="text-xs">
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								<Input
									className="h-7 text-xs flex-1"
									placeholder="Value"
									value={typeof condition.value === "string" ? condition.value : condition.value.join(", ")}
									onChange={(e) =>
										updateCondition(groupIndex, condIndex, "value", e.target.value)
									}
								/>

								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="size-7 p-0 text-muted-foreground hover:text-destructive"
									onClick={() => removeCondition(groupIndex, condIndex)}
								>
									<Trash2 className="size-3" />
								</Button>
							</div>
						</div>
					))}

					<div className="flex items-center gap-2 mt-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-xs h-6"
							onClick={() => addCondition(groupIndex)}
						>
							<Plus className="size-3 mr-1" />
							Add condition
						</Button>
						{groups.length > 1 && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="text-xs h-6 text-muted-foreground hover:text-destructive ml-auto"
								onClick={() => removeGroup(groupIndex)}
							>
								<Trash2 className="size-3 mr-1" />
								Remove group
							</Button>
						)}
					</div>
				</div>
			))}

			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-fit text-xs"
				onClick={addGroup}
			>
				<Plus className="size-3 mr-1" />
				Add OR group
			</Button>
		</div>
	);
}
