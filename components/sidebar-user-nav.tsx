"use client";

import { ChevronUp } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types/auth";
import { LoaderIcon } from "./icons";
import { toast } from "./toast";

export function SidebarUserNav({ user }: { user: User }) {
	const router = useRouter();
	const { session, isLoading } = useAuth();
	const { setTheme, resolvedTheme } = useTheme();

	const isGuest = session?.user?.type === "guest";

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						{isLoading ? (
							<SidebarMenuButton className="h-10 justify-between bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
								<div className="flex flex-row gap-2">
									<div className="size-6 animate-pulse rounded-full bg-zinc-500/30" />
									<span className="animate-pulse rounded-md bg-zinc-500/30 text-transparent">
										Loading auth status
									</span>
								</div>
								<div className="animate-spin text-zinc-500">
									<LoaderIcon />
								</div>
							</SidebarMenuButton>
						) : (
							<SidebarMenuButton
								className="h-10 bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								data-testid="user-nav-button"
							>
								<Image
									alt={user.email ?? "User Avatar"}
									className="rounded-full"
									height={24}
									src={`https://avatar.vercel.sh/${user.email}`}
									width={24}
								/>
								<span className="truncate" data-testid="user-email">
									{isGuest ? "Guest" : user?.email}
								</span>
								<ChevronUp className="ml-auto" />
							</SidebarMenuButton>
						)}
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-popper-anchor-width)"
						data-testid="user-nav-menu"
						side="top"
					>
						<DropdownMenuItem
							className="cursor-pointer"
							data-testid="user-nav-item-theme"
							onSelect={() =>
								setTheme(resolvedTheme === "dark" ? "light" : "dark")
							}
						>
							{`Toggle ${resolvedTheme === "light" ? "dark" : "light"} mode`}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild data-testid="user-nav-item-auth">
							<button
								className="w-full cursor-pointer"
								onClick={async () => {
									if (isLoading) {
										toast({
											type: "error",
											description:
												"Checking authentication status, please try again!",
										});

										return;
									}

									if (isGuest) {
										router.push("/login");
									} else {
										const supabase = createClient();
										await supabase.auth.signOut();
										router.push("/");
									}
								}}
								type="button"
							>
								{isGuest ? "Login to your account" : "Sign out"}
							</button>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
