"use client";

import { Copy, Link2, Loader2, Share2, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type ShareLinkDto = {
	id: string;
	url: string;
	expiresAt: string;
	createdAt: string;
};

const TTL_OPTIONS = [
	{ value: "24", label: "24 hours" },
	{ value: "168", label: "7 days" },
	{ value: "720", label: "30 days" },
];

export function ShareProfileDialog({
	profileId,
	organisationId,
}: {
	profileId: string;
	organisationId?: string;
}) {
	const [open, setOpen] = useState(false);
	const [ttlHours, setTtlHours] = useState<string>("168");
	const [isLoading, setIsLoading] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [links, setLinks] = useState<ShareLinkDto[]>([]);

	const sortedLinks = useMemo(
		() =>
			[...links].sort(
				(a, b) =>
					new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
			),
		[links],
	);

	const loadLinks = useCallback(async () => {
		setIsLoading(true);
		try {
			const qs = organisationId ? `?organisationId=${organisationId}` : "";
			const response = await fetch(
				`/api/profiles/${profileId}/share-link${qs}`,
			);
			if (!response.ok) {
				throw new Error("Failed to load links");
			}
			const data = (await response.json()) as { links: ShareLinkDto[] };
			setLinks(data.links || []);
		} catch (error) {
			console.error(error);
			toast({
				type: "error",
				description: "Could not load share links",
			});
		} finally {
			setIsLoading(false);
		}
	}, [profileId]);

	const copyText = useCallback(async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			toast({
				type: "success",
				description: "Link copied to clipboard",
			});
		} catch {
			toast({
				type: "error",
				description: "Could not copy link",
			});
		}
	}, []);

	const createLink = useCallback(async () => {
		setIsCreating(true);
		try {
			const response = await fetch(`/api/profiles/${profileId}/share-link`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ ttlHours: Number(ttlHours), organisationId }),
			});
			const data = (await response.json()) as {
				error?: string;
				link?: ShareLinkDto;
			};
			if (!response.ok || !data.link) {
				throw new Error(data.error || "Failed to create share link");
			}
			setLinks((previous) => [data.link!, ...previous]);
			await copyText(data.link.url);
		} catch (error) {
			console.error(error);
			toast({
				type: "error",
				description:
					error instanceof Error
						? error.message
						: "Could not create share link",
			});
		} finally {
			setIsCreating(false);
		}
	}, [profileId, ttlHours, copyText]);

	const revokeLink = useCallback(
		async (linkId: string) => {
			try {
				const response = await fetch(`/api/profiles/${profileId}/share-link`, {
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ linkId, organisationId }),
				});
				if (!response.ok) {
					throw new Error("Failed to revoke share link");
				}
				setLinks((previous) => previous.filter((link) => link.id !== linkId));
				toast({
					type: "success",
					description: "Share link revoked",
				});
			} catch (error) {
				console.error(error);
				toast({
					type: "error",
					description: "Could not revoke share link",
				});
			}
		},
		[profileId],
	);

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen) {
					void loadLinks();
				}
			}}
		>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="border-border text-foreground"
				>
					<Share2 className="h-4 w-4 mr-2" />
					Share profile
				</Button>
			</DialogTrigger>
			<DialogContent className="w-[calc(100vw-2rem)] max-w-2xl overflow-hidden border-border bg-background p-0">
				<div className="max-h-[85vh] overflow-y-auto p-6 space-y-4">
					<DialogHeader>
						<DialogTitle className="text-foreground">
							Share candidate profile
						</DialogTitle>
						<DialogDescription className="text-muted-foreground">
							Create a time-limited public link for external stakeholders.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3">
						<div className="rounded-md border border-border bg-muted p-3">
							<p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
								Link expiry
							</p>
							<Select value={ttlHours} onValueChange={setTtlHours}>
								<SelectTrigger className="border-input bg-card">
									<SelectValue placeholder="Select expiry" />
								</SelectTrigger>
								<SelectContent>
									{TTL_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="rounded-md border border-border bg-card p-3">
							<div className="flex items-center justify-between mb-2">
								<p className="text-xs uppercase tracking-wide text-muted-foreground">
									Active links
								</p>
								{isLoading && (
									<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
								)}
							</div>

							{sortedLinks.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									No active links yet.
								</p>
							) : (
								<div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
									{sortedLinks.map((link) => (
										<div
											key={link.id}
											className="grid grid-cols-[1fr_auto] items-start gap-2 rounded-md border border-border p-2.5"
										>
											<div className="min-w-0 space-y-1.5">
												<div className="flex items-start gap-2">
													<Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
													<p className="break-all font-mono text-xs leading-5 text-foreground">
														{link.url}
													</p>
												</div>
												<div className="flex items-center gap-2">
													<Badge
														variant="outline"
														className="text-[10px] text-muted-foreground"
													>
														Expires{" "}
														{new Date(link.expiresAt).toLocaleString("en-GB")}
													</Badge>
												</div>
											</div>
											<div className="flex items-center gap-1 self-center">
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0 text-muted-foreground"
													onClick={() => copyText(link.url)}
													aria-label="Copy share link"
												>
													<Copy className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0 text-destructive"
													onClick={() => revokeLink(link.id)}
													aria-label="Revoke share link"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					<DialogFooter className="pt-2">
						<Button
							variant="outline"
							onClick={() => setOpen(false)}
							className="border-border"
						>
							Close
						</Button>
						<Button onClick={createLink} disabled={isCreating}>
							{isCreating ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Creating…
								</>
							) : (
								"Create link"
							)}
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
