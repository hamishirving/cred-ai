"use client";

import { useState } from "react";
import Image from "next/image";
import faIcon from "@/app/FA-icon.png";
import { MapPin, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/components/toast";
import {
	getProductsByCategory,
	type DHSProduct,
} from "@/lib/api/first-advantage/dhs-catalogue";

// ============================================
// Types
// ============================================

interface CandidateAddress {
	line1?: string;
	city?: string;
	state?: string;
	postcode?: string;
}

interface DHSOrderDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	placementId: string;
	candidateName: string;
	candidateAddress: CandidateAddress | null;
	preSelectedCodes: string[];
	facilityDrugTestRequirements?: string[];
	recommendedReasons?: Record<string, string>;
	onOrderComplete: () => void;
}

// ============================================
// Component
// ============================================

export function DHSOrderDialog({
	open,
	onOpenChange,
	placementId,
	candidateName,
	candidateAddress,
	preSelectedCodes,
	facilityDrugTestRequirements = [],
	recommendedReasons = {},
	onOrderComplete,
}: DHSOrderDialogProps) {
	const [selectedCodes, setSelectedCodes] = useState<Set<string>>(
		new Set(preSelectedCodes),
	);
	const [submitting, setSubmitting] = useState(false);

	const categories = getProductsByCategory();
	const preSelectedSet = new Set(preSelectedCodes);

	function toggleCode(code: string) {
		setSelectedCodes((prev) => {
			const next = new Set(prev);
			if (next.has(code)) {
				next.delete(code);
			} else {
				next.add(code);
			}
			return next;
		});
	}

	async function handleSubmit() {
		if (selectedCodes.size === 0) return;
		setSubmitting(true);

		try {
			const response = await fetch(`/api/placements/${placementId}/dhs-order`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ productCodes: Array.from(selectedCodes) }),
			});

			if (!response.ok) {
				const data = await response.json().catch(() => null);
				toast({
					type: "error",
					description: data?.error || "Failed to place D&OHS order",
				});
				return;
			}

			toast({
				type: "success",
				description: `${selectedCodes.size} D&OHS item${selectedCodes.size !== 1 ? "s" : ""} ordered via First Advantage`,
			});
			onOpenChange(false);
			onOrderComplete();
		} catch {
			toast({ type: "error", description: "Failed to place D&OHS order" });
		} finally {
			setSubmitting(false);
		}
	}

	const addressLine = candidateAddress
		? [candidateAddress.line1, candidateAddress.city, candidateAddress.state, candidateAddress.postcode]
				.filter(Boolean)
				.join(", ")
		: null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-base">
						Order D&OHS Items
						<Image src={faIcon} alt="First Advantage" className="size-5" />
					</DialogTitle>
					<DialogDescription className="text-xs">
						Select drug, health, and occupational screening items for {candidateName}
					</DialogDescription>
				</DialogHeader>

				{/* Address for clinic routing */}
				{addressLine && (
					<div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
						<MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
						<div>
							<p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
								Clinic routing address
							</p>
							<p className="text-xs mt-0.5">{addressLine}</p>
						</div>
					</div>
				)}

				{/* Product list */}
				<div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-4">
					{categories.map(({ category, label, products }) => (
						<div key={category}>
							<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
								{label}
							</h3>
							{category === "drug_screen" &&
								facilityDrugTestRequirements.length > 0 && (
									<p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
										Facility analytes ({facilityDrugTestRequirements.length}):{" "}
										{facilityDrugTestRequirements.join(", ")}
									</p>
								)}
							<div className="space-y-1">
								{products.map((product) => (
									<ProductRow
										key={product.code}
										product={product}
										checked={selectedCodes.has(product.code)}
										required={preSelectedSet.has(product.code)}
										recommendationReason={recommendedReasons[product.code]}
										onToggle={() => toggleCode(product.code)}
									/>
								))}
							</div>
						</div>
					))}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between pt-3 border-t border-border">
					<Button
						variant="outline"
						size="sm"
						onClick={() => onOpenChange(false)}
						disabled={submitting}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={handleSubmit}
						disabled={selectedCodes.size === 0 || submitting}
					>
						{submitting ? (
							<>
								<RefreshCw className="size-3 animate-spin mr-1.5" />
								Ordering…
							</>
						) : (
							`Order ${selectedCodes.size} item${selectedCodes.size !== 1 ? "s" : ""}`
						)}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// ============================================
// Product row
// ============================================

function ProductRow({
	product,
	checked,
	required,
	recommendationReason,
	onToggle,
}: {
	product: DHSProduct;
	checked: boolean;
	required: boolean;
	recommendationReason?: string;
	onToggle: () => void;
}) {
	return (
		<label className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors duration-150 cursor-pointer">
			<Checkbox
				checked={checked}
				onCheckedChange={onToggle}
				className="shrink-0"
			/>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="text-sm">{product.name}</span>
					{required && (
						<Badge variant="warning" className="text-[10px] font-medium shrink-0">
							Required
						</Badge>
					)}
				</div>
				<p className="text-[10px] text-muted-foreground mt-0.5">
					{product.description}
				</p>
				{recommendationReason && (
					<p className="text-[10px] text-primary mt-0.5 font-medium">
						{recommendationReason}; {product.code} recommended
					</p>
				)}
			</div>
			<span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
				{product.code}
			</span>
		</label>
	);
}
