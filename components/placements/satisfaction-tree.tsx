"use client";

import { Check, Circle, Clock, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ItemStatus =
	| "met"
	| "expiring"
	| "expired"
	| "pending"
	| "requires_review"
	| "missing";

export type SatisfactionLogic =
	| { op: "ALL"; children: SatisfactionLogic[] }
	| { op: "ANY"; children: SatisfactionLogic[] }
	| { op: "ELEMENT"; slug: string };

interface SatisfactionTreeProps {
	logic: SatisfactionLogic;
	matchedPath?: SatisfactionLogic | null;
	leafStatuses?: Record<string, ItemStatus>;
	elementNames?: Record<string, string>;
	onLeafClick?: (slug: string) => void;
}

function isSameNode(
	a: SatisfactionLogic,
	b: SatisfactionLogic | null | undefined,
): boolean {
	if (!b) return false;
	if (a.op !== b.op) return false;
	if (a.op === "ELEMENT" && b.op === "ELEMENT") return a.slug === b.slug;
	if (a.op !== "ELEMENT" && b.op !== "ELEMENT") {
		if (a.children.length !== b.children.length) return false;
		return a.children.every((child, i) => isSameNode(child, b.children[i]));
	}
	return false;
}

function nodeIsOnMatchedPath(
	node: SatisfactionLogic,
	matched: SatisfactionLogic | null | undefined,
): boolean {
	if (!matched) return false;
	if (isSameNode(node, matched)) return true;
	if (node.op === "ELEMENT") return false;
	return node.children.some((child) => nodeIsOnMatchedPath(child, matched));
}

function StatusIcon({ status }: { status: ItemStatus }) {
	const common = "size-3.5 shrink-0";
	if (status === "met")
		return <Check className={cn(common, "text-[var(--positive)]")} />;
	if (
		status === "pending" ||
		status === "requires_review" ||
		status === "expiring"
	)
		return <Clock className={cn(common, "text-[var(--warning)]")} />;
	if (status === "expired")
		return <X className={cn(common, "text-destructive")} />;
	return <Circle className={cn(common, "text-muted-foreground")} />;
}

function LeafRow({
	name,
	status,
	matched,
	onClick,
	hasEvidence,
}: {
	name: string;
	status: ItemStatus;
	matched: boolean;
	onClick?: () => void;
	hasEvidence?: boolean;
}) {
	const content = (
		<>
			<StatusIcon status={status} />
			<span className="truncate flex-1 text-left">{name}</span>
			{onClick && (
				<FileText
					className={cn(
						"size-3.5 shrink-0 transition-colors",
						hasEvidence
							? "text-[var(--positive)]"
							: "text-muted-foreground group-hover:text-foreground",
					)}
					aria-label={hasEvidence ? "View document" : "Upload document"}
				/>
			)}
		</>
	);

	const classes = cn(
		"flex items-center gap-2 py-1 text-xs w-full",
		matched && "font-medium",
		!matched && status !== "met" && "text-muted-foreground",
	);

	if (onClick) {
		return (
			<button
				type="button"
				onClick={onClick}
				className={cn(
					classes,
					"group rounded px-1 -mx-1 hover:bg-muted/60 cursor-pointer transition-colors",
				)}
			>
				{content}
			</button>
		);
	}

	return <div className={classes}>{content}</div>;
}

/**
 * Render an ALL-group or a single ELEMENT as a bordered panel. This is the
 * "row" inside an ANY parent — the unit that OR branches switch between.
 */
function BranchPanel({
	node,
	matchedPath,
	leafStatuses,
	elementNames,
	onLeafClick,
}: {
	node: SatisfactionLogic;
	matchedPath: SatisfactionLogic | null | undefined;
	leafStatuses: Record<string, ItemStatus> | undefined;
	elementNames: Record<string, string> | undefined;
	onLeafClick?: (slug: string) => void;
}) {
	const highlighted = nodeIsOnMatchedPath(node, matchedPath);
	const dim = matchedPath && !highlighted;

	const label =
		node.op === "ALL" ? "All of" : node.op === "ANY" ? "Any one of" : null;

	const children: SatisfactionLogic[] =
		node.op === "ELEMENT" ? [node] : node.children;

	return (
		<div
			className={cn(
				"rounded-md border bg-card overflow-hidden transition-opacity",
				highlighted
					? "border-[var(--positive)] bg-[color-mix(in_srgb,var(--positive)_6%,transparent)]"
					: "border-border",
				dim && "opacity-60",
			)}
		>
			{label && (
				<div
					className={cn(
						"flex items-center gap-2 px-2.5 py-1 border-b text-[10px] font-semibold uppercase tracking-wide",
						highlighted
							? "border-[var(--positive)]/30 text-[var(--positive)] bg-[color-mix(in_srgb,var(--positive)_8%,transparent)]"
							: "border-border text-muted-foreground bg-muted/40",
					)}
				>
					<span>{label}</span>
					{highlighted && (
						<span className="text-[9px] font-medium normal-case tracking-normal text-[var(--positive)]">
							satisfies
						</span>
					)}
				</div>
			)}
			<div className="px-2.5 py-1">
				{children.map((child, i) => {
					if (child.op === "ELEMENT") {
						const leafSlug = child.slug;
						const status = leafStatuses?.[leafSlug] ?? "missing";
						const name = elementNames?.[leafSlug] ?? leafSlug;
						const isMatchedLeaf = isSameNode(child, matchedPath ?? null);
						const hasEvidence = status !== "missing" && status !== "expired";
						return (
							<LeafRow
								// biome-ignore lint/suspicious/noArrayIndexKey: positional
								key={i}
								name={name}
								status={status}
								matched={highlighted || isMatchedLeaf}
								hasEvidence={hasEvidence}
								onClick={
									onLeafClick ? () => onLeafClick(leafSlug) : undefined
								}
							/>
						);
					}
					// Nested group (rare) — indent
					return (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: positional
							key={i}
							className="mt-1"
						>
							<BranchPanel
								node={child}
								matchedPath={matchedPath}
								leafStatuses={leafStatuses}
								elementNames={elementNames}
								onLeafClick={onLeafClick}
							/>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function OrDivider({ highlighted }: { highlighted: boolean }) {
	return (
		<div className="flex items-center gap-2 px-1 py-0.5">
			<div className="h-px flex-1 bg-border" />
			<span
				className={cn(
					"text-[9px] font-semibold uppercase tracking-wider",
					highlighted ? "text-[var(--positive)]" : "text-muted-foreground",
				)}
			>
				or
			</span>
			<div className="h-px flex-1 bg-border" />
		</div>
	);
}

export function SatisfactionTree({
	logic,
	matchedPath,
	leafStatuses,
	elementNames,
	onLeafClick,
}: SatisfactionTreeProps) {
	// Flat ANY-of-branches: render each branch as a panel with "OR" between.
	if (logic.op === "ANY") {
		const matchedSomewhere = !!matchedPath;
		return (
			<div className="flex flex-col gap-1.5">
				{logic.children.map((branch, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: positional
						key={i}
					>
						{i > 0 && <OrDivider highlighted={matchedSomewhere} />}
						<BranchPanel
							node={branch}
							matchedPath={matchedPath}
							leafStatuses={leafStatuses}
							elementNames={elementNames}
							onLeafClick={onLeafClick}
						/>
					</div>
				))}
			</div>
		);
	}

	// Fall through for ALL / ELEMENT roots (rare).
	return (
		<BranchPanel
			node={logic}
			matchedPath={matchedPath}
			leafStatuses={leafStatuses}
			elementNames={elementNames}
			onLeafClick={onLeafClick}
		/>
	);
}
