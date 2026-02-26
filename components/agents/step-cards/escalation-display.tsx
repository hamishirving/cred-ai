"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EscalationOption {
	id: string;
	label: string;
	description: string;
	isRecommended: boolean;
}

interface EscalationData {
	escalationId: string;
	type: string;
	priority: string;
	question: string;
	aiReasoning: string;
	aiRecommendation: string;
	options: EscalationOption[];
}

function PriorityBadge({ priority }: { priority: string }) {
	switch (priority) {
		case "critical":
			return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Critical</Badge>;
		case "high":
			return <Badge variant="warning" className="text-[10px] px-1.5 py-0">High</Badge>;
		case "medium":
			return <Badge variant="neutral" className="text-[10px] px-1.5 py-0">Medium</Badge>;
		default:
			return <Badge variant="neutral" className="text-[10px] px-1.5 py-0">{priority}</Badge>;
	}
}

export function EscalationDisplay({ data }: { data: EscalationData }) {
	const [selectedId, setSelectedId] = useState<string | null>(null);

	return (
		<div className="not-prose my-3 rounded-lg border border-amber-300/60 bg-card text-card-foreground overflow-hidden">
			{/* Warning header */}
			<div className="px-4 py-3 bg-amber-50/80 border-b border-amber-200/60">
				<div className="flex items-start gap-2.5">
					<AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<h4 className="text-sm font-semibold text-neutral-900 leading-tight">
								{data.question}
							</h4>
							<PriorityBadge priority={data.priority} />
						</div>
					</div>
				</div>
			</div>

			{/* AI reasoning */}
			<div className="px-4 py-3 bg-neutral-50/60 border-b">
				<div className="flex items-start gap-2">
					<FlaskConical className="size-3.5 text-neutral-500 shrink-0 mt-0.5" />
					<div>
						<p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide mb-1">
							AI Analysis
						</p>
						<p className="text-xs text-neutral-700 leading-relaxed">
							{data.aiReasoning}
						</p>
					</div>
				</div>
			</div>

			{/* Options */}
			<div className="p-3">
				<p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide mb-2 px-1">
					Decision Required
				</p>
				<div className="grid grid-cols-3 gap-2">
					{data.options.map((option) => {
						const isSelected = selectedId === option.id;
						const isRecommended = option.isRecommended;

						return (
							<button
								key={option.id}
								type="button"
								onClick={() => setSelectedId(option.id)}
								className={`
									relative text-left rounded-md border p-3 transition-colors duration-150 cursor-pointer
									${isSelected
										? "border-green-400 bg-green-50/50 ring-1 ring-green-400/30"
										: isRecommended
											? "border-green-300/60 bg-white hover:border-green-400/80 hover:bg-green-50/30"
											: "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50"
									}
								`}
							>
								{isRecommended && !isSelected && (
									<Badge variant="success" className="absolute -top-2 right-2 text-[9px] px-1.5 py-0">
										Recommended
									</Badge>
								)}
								{isSelected && (
									<CheckCircle2 className="absolute top-2 right-2 size-4 text-green-600" />
								)}
								<span className="text-xs font-semibold text-neutral-900 block mb-1">
									{option.label}
								</span>
								<span className="text-[11px] text-neutral-600 leading-snug block">
									{option.description}
								</span>
							</button>
						);
					})}
				</div>

				{selectedId && (
					<div className="mt-2.5 flex items-center gap-1.5 px-1">
						<CheckCircle2 className="size-3 text-green-600 shrink-0" />
						<span className="text-xs text-green-700">
							Selected: {data.options.find((o) => o.id === selectedId)?.label}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
