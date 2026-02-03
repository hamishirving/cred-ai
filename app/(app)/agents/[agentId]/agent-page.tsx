"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
	getSortedRowModel,
	getPaginationRowModel,
	type SortingState,
} from "@tanstack/react-table";
import {
	ArrowLeft,
	ArrowUpDown,
	Pencil,
	Play,
	Zap,
	Shield,
	Wrench,
	Upload,
	Loader2,
	CheckCircle2,
	Check,
	X,
	AlertTriangle,
	Clock,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useAgentExecution } from "@/hooks/use-agent-execution";
import type { SerializedAgentDefinition } from "@/lib/ai/agents/types";
import { TableLoader } from "@/components/elements/table-loader";

// =============================================================================
// TYPES & CONFIG
// =============================================================================

interface AgentExecution {
	id: string;
	agentId: string;
	status: "running" | "completed" | "failed" | "escalated";
	durationMs: number | null;
	tokensUsed: {
		inputTokens: number;
		outputTokens: number;
		totalTokens: number;
	} | null;
	startedAt: string;
	completedAt: string | null;
	createdAt: string;
}

const statusConfig = {
	running: { label: "Running", icon: Loader2, color: "text-[#4444cf]", bg: "bg-[#eeedf8]", iconClass: "animate-spin" },
	completed: { label: "Completed", icon: Check, color: "text-[#3a9960]", bg: "bg-[#eef6f1]", iconClass: "" },
	failed: { label: "Failed", icon: X, color: "text-[#c93d4e]", bg: "bg-[#fdf0f1]", iconClass: "" },
	escalated: { label: "Escalated", icon: AlertTriangle, color: "text-[#c49332]", bg: "bg-[#faf5eb]", iconClass: "" },
};

const statusOrder: Record<string, number> = {
	running: 0,
	escalated: 1,
	failed: 2,
	completed: 3,
};

// =============================================================================
// COLUMN HEADER
// =============================================================================

function SortableHeader({ column, children }: { column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => false | "asc" | "desc" }; children: React.ReactNode }) {
	return (
		<Button
			variant="ghost"
			onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			className="-ml-2 h-8 px-2 text-xs font-medium text-[#6b6760] hover:text-[#3d3a32] hover:bg-[#f0ede7] cursor-pointer"
		>
			{children}
			<ArrowUpDown className="ml-2 h-3 w-3" />
		</Button>
	);
}

// =============================================================================
// COLUMNS
// =============================================================================

function createRunColumns(agentId: string): ColumnDef<AgentExecution>[] {
	return [
		{
			accessorKey: "status",
			header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
			cell: ({ row }) => {
				const config = statusConfig[row.original.status];
				const StatusIcon = config.icon;
				return (
					<span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", config.color, config.bg)}>
						<StatusIcon className={cn("h-3 w-3", config.iconClass)} />
						{config.label}
					</span>
				);
			},
			sortingFn: (rowA, rowB) =>
				(statusOrder[rowA.original.status] ?? 99) - (statusOrder[rowB.original.status] ?? 99),
		},
		{
			accessorKey: "durationMs",
			header: ({ column }) => <SortableHeader column={column}>Duration</SortableHeader>,
			cell: ({ row }) => (
				<span className="text-sm text-[#8a857d] tabular-nums">
					{row.original.durationMs
						? `${(row.original.durationMs / 1000).toFixed(1)}s`
						: "—"}
				</span>
			),
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => <SortableHeader column={column}>When</SortableHeader>,
			cell: ({ row }) => (
				<span className="text-sm text-[#8a857d] whitespace-nowrap">
					{formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true })}
				</span>
			),
		},
		{
			id: "chevron",
			enableSorting: false,
			cell: () => <ChevronRight className="h-4 w-4 text-[#a8a49c]" />,
		},
	];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const PAGE_SIZE = 10;

interface AgentPageProps {
	agent: SerializedAgentDefinition;
}

export function AgentPage({ agent }: AgentPageProps) {
	const router = useRouter();
	const [executions, setExecutions] = useState<AgentExecution[]>([]);
	const [loadingExecs, setLoadingExecs] = useState(true);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [formData, setFormData] = useState<Record<string, string>>(() => {
		const defaults: Record<string, string> = {};
		for (const field of agent.inputFields) {
			if (field.defaultValue) {
				defaults[field.key] = field.defaultValue;
			}
		}
		return defaults;
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done" | "error">("idle");
	const [uploadError, setUploadError] = useState("");
	const [uploadedFileName, setUploadedFileName] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [sorting, setSorting] = useState<SortingState>([]);

	const { execute, executionId } = useAgentExecution();

	const columns = useMemo(() => createRunColumns(agent.id), [agent.id]);

	const table = useReactTable({
		data: executions,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		state: { sorting },
		initialState: {
			pagination: { pageSize: PAGE_SIZE },
		},
	});

	useEffect(() => {
		async function fetchExecutions() {
			setLoadingExecs(true);
			try {
				const res = await fetch(`/api/agents/${agent.id}/executions`);
				if (res.ok) {
					const data = await res.json();
					setExecutions(data.executions || []);
				}
			} catch {
				// Silently fail
			} finally {
				setLoadingExecs(false);
			}
		}
		fetchExecutions();
	}, [agent.id]);

	useEffect(() => {
		if (executionId && isSubmitting) {
			router.push(`/agents/${agent.id}/executions/${executionId}`);
		}
	}, [executionId, isSubmitting, agent.id, router]);

	async function handleFileUpload(
		e: React.ChangeEvent<HTMLInputElement>,
		fieldKey: string,
	) {
		const file = e.target.files?.[0];
		if (!file) return;

		setUploadState("uploading");
		setUploadError("");
		setUploadedFileName(file.name);

		try {
			const fd = new FormData();
			fd.append("file", file);

			const res = await fetch("/api/agents/upload", {
				method: "POST",
				body: fd,
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Upload failed");
			}

			const data = await res.json();
			setFormData((prev) => ({ ...prev, [fieldKey]: data.url }));
			setUploadState("done");
		} catch (err) {
			setUploadState("error");
			setUploadError(err instanceof Error ? err.message : "Upload failed");
		}
	}

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			setIsSubmitting(true);
			setDialogOpen(false);
			execute(agent.id, formData);
		},
		[agent.id, formData, execute],
	);

	const pageIndex = table.getState().pagination.pageIndex;
	const pageCount = table.getPageCount();
	const totalRows = executions.length;
	const startRow = pageIndex * PAGE_SIZE + 1;
	const endRow = Math.min((pageIndex + 1) * PAGE_SIZE, totalRows);

	return (
		<div className="min-h-0 bg-[#f7f5f0]">
			<div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
				{/* Back link */}
				<Button variant="ghost" size="sm" className="h-7 -ml-2 text-[#6b6760] hover:text-[#1c1a15]" asChild>
					<Link href="/agents">
						<ArrowLeft className="size-3 mr-1" />
						Agents
					</Link>
				</Button>

				{/* Header */}
				<div className="flex items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold text-[#1c1a15]" style={{ textWrap: "balance" }}>{agent.name}</h1>
						<p className="text-sm text-[#6b6760] mt-1 max-w-[65ch]">
							{agent.description}
						</p>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<Button variant="outline" size="sm" className="h-8" asChild>
							<Link href={`/agents/${agent.id}/edit`}>
								<Pencil className="size-3 mr-1.5" />
								Edit
							</Link>
						</Button>
						<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
							<DialogTrigger asChild>
								<Button size="sm" className="h-8">
									<Play className="size-3 mr-1.5" />
									Test
								</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-md">
								<DialogHeader>
									<DialogTitle className="text-sm">Test {agent.name}</DialogTitle>
								</DialogHeader>
								<form onSubmit={handleSubmit} className="flex flex-col gap-3">
									{agent.inputFields.map((field) => {
										const isUrl = field.key.toLowerCase().includes("url");
										const isPhoneNumber = field.key.toLowerCase().includes("phone");
										const isBodyText = field.key.toLowerCase().includes("body");
										const hasDefault = !!field.defaultValue && !isPhoneNumber;

										return (
											<div key={field.key} className="flex flex-col gap-1.5">
												<Label htmlFor={field.key} className="text-xs">
													{field.label}
													{field.required && (
														<span className="text-destructive ml-0.5">*</span>
													)}
												</Label>

												{isUrl ? (
													<div className="flex flex-col gap-2">
														<div
															className={cn(
																"flex items-center gap-2 p-3 border border-dashed border-[#ccc8c0] rounded-md transition-colors duration-150",
																hasDefault
																	? "opacity-50 cursor-not-allowed"
																	: "cursor-pointer hover:bg-[#f7f5f0]",
															)}
															onClick={() => !hasDefault && fileInputRef.current?.click()}
															onKeyDown={(e) => {
																if (!hasDefault && (e.key === "Enter" || e.key === " ")) {
																	fileInputRef.current?.click();
																}
															}}
															role="button"
															tabIndex={hasDefault ? -1 : 0}
														>
															<input
																ref={fileInputRef}
																type="file"
																accept="image/*,application/pdf"
																className="hidden"
																disabled={hasDefault}
																onChange={(e) => handleFileUpload(e, field.key)}
															/>
															{uploadState === "uploading" ? (
																<>
																	<Loader2 className="size-4 animate-spin text-[#8a857d]" />
																	<span className="text-xs text-[#8a857d]">
																		Uploading {uploadedFileName}…
																	</span>
																</>
															) : uploadState === "done" ? (
																<>
																	<CheckCircle2 className="size-4 text-[#3a9960]" />
																	<span className="text-xs text-[#3a9960]">
																		{uploadedFileName}
																	</span>
																</>
															) : (
																<>
																	<Upload className="size-4 text-[#8a857d]" />
																	<span className="text-xs text-[#8a857d]">
																		Upload certificate image or PDF
																	</span>
																</>
															)}
														</div>

														{uploadState === "error" && (
															<p className="text-xs text-destructive">
																{uploadError}
															</p>
														)}

														<div className="flex items-center gap-2">
															<div className="h-px flex-1 bg-[#e5e2db]" />
															<span className="text-xs text-[#8a857d]">
																or paste URL
															</span>
															<div className="h-px flex-1 bg-[#e5e2db]" />
														</div>

														<Input
															id={field.key}
															placeholder={field.description}
															value={formData[field.key] || ""}
															disabled={hasDefault}
															onChange={(e) =>
																setFormData((prev) => ({
																	...prev,
																	[field.key]: e.target.value,
																}))
															}
															className="text-sm"
														/>
													</div>
												) : isBodyText ? (
													<Textarea
														id={field.key}
														placeholder={field.description}
														value={formData[field.key] || ""}
														disabled={hasDefault}
														onChange={(e) =>
															setFormData((prev) => ({
																...prev,
																[field.key]: e.target.value,
															}))
														}
														rows={4}
														className="text-sm resize-none"
													/>
												) : (
													<Input
														id={field.key}
														placeholder={field.description}
														value={formData[field.key] || ""}
														disabled={hasDefault}
														onChange={(e) =>
															setFormData((prev) => ({
																...prev,
																[field.key]: e.target.value,
															}))
														}
														className="text-sm"
													/>
												)}
											</div>
										);
									})}

									<Button
										type="submit"
										size="sm"
										disabled={isSubmitting || uploadState === "uploading"}
									>
										{isSubmitting ? (
											<Loader2 className="size-3 mr-1 animate-spin" />
										) : (
											<Play className="size-3 mr-1" />
										)}
										{isSubmitting ? "Starting…" : "Run"}
									</Button>
								</form>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				{/* Details card */}
				<div className="bg-white border border-[#e5e2db] rounded-lg p-5">
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
						<div className="flex flex-col gap-1">
							<span className="text-xs font-medium text-[#6b6760] flex items-center gap-1.5">
								<Zap className="size-3" />
								Trigger
							</span>
							<span className="text-sm text-[#1c1a15] capitalize">{agent.trigger.type}</span>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-xs font-medium text-[#6b6760] flex items-center gap-1.5">
								<Shield className="size-3" />
								Oversight
							</span>
							<span className="text-sm text-[#1c1a15] capitalize">{agent.oversight.mode}</span>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-xs font-medium text-[#6b6760] flex items-center gap-1.5">
								<Wrench className="size-3" />
								Tools
							</span>
							<span className="text-sm text-[#1c1a15]">{agent.tools.length}</span>
						</div>
						<div className="flex flex-col gap-1">
							<span className="text-xs font-medium text-[#6b6760]">Version</span>
							<span className="text-sm text-[#1c1a15]">v{agent.version}</span>
						</div>
					</div>
				</div>

				{/* Tools */}
				<div>
					<h2 className="text-base font-medium text-[#1c1a15] mb-3">Tools</h2>
					<div className="flex flex-wrap gap-2">
						{agent.tools.map((tool) => (
							<Badge key={tool} variant="secondary" className="text-xs">
								{tool}
							</Badge>
						))}
					</div>
				</div>

				{/* Runs */}
				<div>
					<div className="flex items-center justify-between mb-3">
						<h2 className="text-base font-medium text-[#1c1a15]">Runs</h2>
						<span className="text-xs text-[#8a857d]">{totalRows} total</span>
					</div>

					<div className="bg-white border border-[#e5e2db] rounded-lg overflow-hidden">
						{loadingExecs ? (
							<TableLoader cols={4} rows={5} />
						) : totalRows === 0 ? (
							<div className="flex flex-col items-center justify-center py-16">
								<Clock className="h-8 w-8 text-[#a8a49c] mb-3" />
								<p className="text-base font-medium text-[#1c1a15]">No runs yet</p>
								<p className="text-sm text-[#8a857d] mt-1">
									Click Test to run this agent
								</p>
							</div>
						) : (
							<Table>
								<TableHeader>
									{table.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id} className="bg-[#f0ede7] hover:bg-[#f0ede7]">
											{headerGroup.headers.map((header) => (
												<TableHead
													key={header.id}
													className="text-xs font-medium text-[#6b6760]"
												>
													{header.isPlaceholder
														? null
														: flexRender(header.column.columnDef.header, header.getContext())}
												</TableHead>
											))}
										</TableRow>
									))}
								</TableHeader>
								<TableBody>
									{table.getRowModel().rows.map((row) => (
										<TableRow
											key={row.id}
											className="bg-white cursor-pointer hover:bg-[#f7f5f0] border-b border-[#e5e2db]"
											onClick={() =>
												router.push(`/agents/${agent.id}/executions/${row.original.id}`)
											}
										>
											{row.getVisibleCells().map((cell) => (
												<TableCell key={cell.id}>
													{flexRender(cell.column.columnDef.cell, cell.getContext())}
												</TableCell>
											))}
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</div>

					{/* Pagination */}
					{pageCount > 1 && (
						<div className="flex items-center justify-between mt-3 text-xs text-[#8a857d]">
							<span>
								{startRow}–{endRow} of {totalRows}
							</span>
							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="sm"
									className="h-7 w-7 p-0"
									disabled={!table.getCanPreviousPage()}
									onClick={() => table.previousPage()}
								>
									<ChevronLeft className="size-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 w-7 p-0"
									disabled={!table.getCanNextPage()}
									onClick={() => table.nextPage()}
								>
									<ChevronRight className="size-3.5" />
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
