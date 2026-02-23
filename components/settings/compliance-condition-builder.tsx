"use client";

import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

// ============================================
// Types
// ============================================

export interface ComplianceCondition {
	property: string;
	operator: string;
	value: string;
}

// ============================================
// Properties and their allowed values
// ============================================

const PROPERTIES = [
	{ value: "dealType", label: "Deal type" },
	{ value: "statePolicy", label: "State policy" },
	{ value: "facilityContract", label: "Facility contract" },
	{ value: "candidateStatus", label: "Candidate status" },
	{ value: "roleType", label: "Role type" },
];

const OPERATORS: Record<string, Array<{ value: string; label: string }>> = {
	dealType: [
		{ value: "equals", label: "equals" },
		{ value: "not_equals", label: "does not equal" },
	],
	statePolicy: [
		{ value: "requires", label: "requires" },
	],
	facilityContract: [
		{ value: "requires", label: "requires" },
	],
	candidateStatus: [
		{ value: "equals", label: "equals" },
		{ value: "not_equals", label: "does not equal" },
	],
	roleType: [
		{ value: "equals", label: "equals" },
		{ value: "not_equals", label: "does not equal" },
	],
};

const VALUES: Record<string, Array<{ value: string; label: string }>> = {
	dealType: [
		{ value: "lapse", label: "Lapse (inactive 90+ days)" },
		{ value: "standard", label: "Standard" },
		{ value: "extension", label: "Extension" },
	],
	statePolicy: [
		{ value: "oig-sam", label: "OIG/SAM screening" },
		{ value: "enhanced-background", label: "Enhanced background check" },
		{ value: "fingerprinting", label: "Fingerprinting" },
	],
	facilityContract: [
		{ value: "oig-sam", label: "OIG/SAM screening" },
		{ value: "drug-screening", label: "Drug screening" },
		{ value: "enhanced-background", label: "Enhanced background check" },
	],
	candidateStatus: [
		{ value: "inactive-90", label: "Inactive 90+ days" },
		{ value: "inactive-180", label: "Inactive 180+ days" },
		{ value: "new-hire", label: "New hire" },
		{ value: "returning", label: "Returning" },
	],
	roleType: [
		{ value: "travel", label: "Travel" },
		{ value: "permanent", label: "Permanent" },
		{ value: "per-diem", label: "Per diem" },
	],
};

function getDefaultOperator(property: string): string {
	const ops = OPERATORS[property];
	return ops?.[0]?.value ?? "equals";
}

function getDefaultValue(property: string): string {
	const vals = VALUES[property];
	return vals?.[0]?.value ?? "";
}

// ============================================
// Component
// ============================================

interface ComplianceConditionBuilderProps {
	conditions: ComplianceCondition[];
	onChange: (conditions: ComplianceCondition[]) => void;
}

export function ComplianceConditionBuilder({
	conditions,
	onChange,
}: ComplianceConditionBuilderProps) {
	function addCondition() {
		const prop = "dealType";
		onChange([
			...conditions,
			{
				property: prop,
				operator: getDefaultOperator(prop),
				value: getDefaultValue(prop),
			},
		]);
	}

	function removeCondition(index: number) {
		onChange(conditions.filter((_, i) => i !== index));
	}

	function updateCondition(
		index: number,
		field: keyof ComplianceCondition,
		value: string,
	) {
		const updated = [...conditions];
		if (field === "property") {
			// Reset operator and value when property changes
			updated[index] = {
				property: value,
				operator: getDefaultOperator(value),
				value: getDefaultValue(value),
			};
		} else {
			updated[index] = { ...updated[index], [field]: value };
		}
		onChange(updated);
	}

	if (conditions.length === 0) {
		return (
			<div className="flex items-center gap-3">
				<p className="text-xs text-muted-foreground">
					No conditions. Exclusion screening won't trigger.
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="text-xs h-6 shrink-0"
					onClick={addCondition}
				>
					<Plus className="size-3 mr-1" />
					Add condition
				</Button>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			{conditions.map((condition, index) => {
				const operators = OPERATORS[condition.property] || OPERATORS.dealType;
				const values = VALUES[condition.property] || VALUES.dealType;

				return (
					<div key={index} className="flex flex-col gap-1">
						{index > 0 && (
							<span className="text-[10px] font-medium text-[#c93d4e] ml-1">
								OR
							</span>
						)}
						<div className="flex items-center gap-1.5">
							<span className="text-xs text-muted-foreground shrink-0 w-6">
								{index === 0 ? "If" : ""}
							</span>

							<Select
								value={condition.property}
								onValueChange={(v) =>
									updateCondition(index, "property", v)
								}
							>
								<SelectTrigger className="h-7 text-xs w-[150px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{PROPERTIES.map((p) => (
										<SelectItem
											key={p.value}
											value={p.value}
											className="text-xs"
										>
											{p.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select
								value={condition.operator}
								onValueChange={(v) =>
									updateCondition(index, "operator", v)
								}
							>
								<SelectTrigger className="h-7 text-xs w-[120px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{operators.map((o) => (
										<SelectItem
											key={o.value}
											value={o.value}
											className="text-xs"
										>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select
								value={condition.value}
								onValueChange={(v) =>
									updateCondition(index, "value", v)
								}
							>
								<SelectTrigger className="h-7 text-xs flex-1 min-w-[160px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{values.map((v) => (
										<SelectItem
											key={v.value}
											value={v.value}
											className="text-xs"
										>
											{v.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="size-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
								onClick={() => removeCondition(index)}
							>
								<Trash2 className="size-3" />
							</Button>
						</div>
					</div>
				);
			})}

			<div className="flex items-center gap-2 mt-0.5">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="text-xs h-6"
					onClick={addCondition}
				>
					<Plus className="size-3 mr-1" />
					Add condition
				</Button>
			</div>
		</div>
	);
}

// ============================================
// Helpers for the requirement builder
// ============================================

/** Evaluate conditions to determine what triggers the resolution engine */
export function evaluateConditions(conditions: ComplianceCondition[]): {
	isLapseDeal: boolean;
	stateRequiresOigSam: boolean;
	facilityRequiresOigSam: boolean;
} {
	let isLapseDeal = false;
	let stateRequiresOigSam = false;
	let facilityRequiresOigSam = false;

	for (const cond of conditions) {
		// Deal type = lapse
		if (
			cond.property === "dealType" &&
			cond.operator === "equals" &&
			cond.value === "lapse"
		) {
			isLapseDeal = true;
		}

		// Candidate inactive 90+ days (also triggers lapse logic)
		if (
			cond.property === "candidateStatus" &&
			cond.operator === "equals" &&
			(cond.value === "inactive-90" || cond.value === "inactive-180")
		) {
			isLapseDeal = true;
		}

		// State requires OIG/SAM
		if (
			cond.property === "statePolicy" &&
			cond.operator === "requires" &&
			cond.value === "oig-sam"
		) {
			stateRequiresOigSam = true;
		}

		// Facility requires OIG/SAM
		if (
			cond.property === "facilityContract" &&
			cond.operator === "requires" &&
			cond.value === "oig-sam"
		) {
			facilityRequiresOigSam = true;
		}
	}

	return { isLapseDeal, stateRequiresOigSam, facilityRequiresOigSam };
}
