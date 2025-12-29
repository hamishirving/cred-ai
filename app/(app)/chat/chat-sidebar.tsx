"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { PlusIcon, TrashIcon } from "@/components/icons";
import {
	getChatHistoryPaginationKey,
	SidebarHistory,
} from "@/components/sidebar-history";
import { Button } from "@/components/ui/button";
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarProvider,
} from "@/components/ui/sidebar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { User } from "@/lib/types/auth";

interface ChatSidebarProps {
	user: User | undefined;
	children: React.ReactNode;
}

export function ChatSidebar({ user, children }: ChatSidebarProps) {
	const router = useRouter();
	const { mutate } = useSWRConfig();
	const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

	const handleDeleteAll = () => {
		const deletePromise = fetch("/api/history", {
			method: "DELETE",
		});

		toast.promise(deletePromise, {
			loading: "Deleting all chats...",
			success: () => {
				mutate(unstable_serialize(getChatHistoryPaginationKey));
				router.push("/chat");
				setShowDeleteAllDialog(false);
				return "All chats deleted successfully";
			},
			error: "Failed to delete all chats",
		});
	};

	return (
		<SidebarProvider
			defaultOpen={true}
			style={
				{
					"--sidebar-width": "280px",
				} as React.CSSProperties
			}
		>
			<Sidebar collapsible="none" className="border-r">
				<SidebarHeader>
					<SidebarMenu>
						<div className="flex flex-row items-center justify-between px-2">
							<span className="font-semibold text-sm">Chat History</span>
							<div className="flex flex-row gap-1">
								{user && (
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												className="h-7 w-7"
												onClick={() => setShowDeleteAllDialog(true)}
												type="button"
												variant="ghost"
												size="icon"
											>
												<TrashIcon />
											</Button>
										</TooltipTrigger>
										<TooltipContent>Delete All Chats</TooltipContent>
									</Tooltip>
								)}
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											className="h-7 w-7"
											onClick={() => {
												router.push("/chat");
												router.refresh();
											}}
											type="button"
											variant="ghost"
											size="icon"
										>
											<PlusIcon />
										</Button>
									</TooltipTrigger>
									<TooltipContent>New Chat</TooltipContent>
								</Tooltip>
							</div>
						</div>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<SidebarHistory user={user} />
				</SidebarContent>
			</Sidebar>
			<main className="flex-1 overflow-hidden">{children}</main>

			<AlertDialog
				onOpenChange={setShowDeleteAllDialog}
				open={showDeleteAllDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete all chats?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete all
							your chats and remove them from our servers.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteAll}>
							Delete All
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</SidebarProvider>
	);
}
