"use client";

import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { useOrg } from "@/lib/org-context";

export function OrgSwitcher() {
	const { isMobile } = useSidebar();
	const { organisations, selectedOrg, setSelectedOrgId, loading } = useOrg();

	if (loading) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton size="lg" disabled>
						<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
							<Loader2 className="size-4 animate-spin" />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-semibold text-muted-foreground">
								Loading...
							</span>
						</div>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	if (!selectedOrg) {
		return null;
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
								<Building2 className="size-4" />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">{selectedOrg.name}</span>
								<span className="truncate text-xs">{selectedOrg.type ?? "Organisation"}</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							Organisations
						</DropdownMenuLabel>
						{organisations.map((org) => (
							<DropdownMenuItem
								key={org.id}
								className="gap-2 p-2"
								onClick={() => setSelectedOrgId(org.id)}
							>
								<div className="flex size-6 items-center justify-center rounded-sm border">
									<Building2 className="size-4 shrink-0" />
								</div>
								<span className="flex-1">{org.name}</span>
								{selectedOrg.id === org.id && (
									<Check className="size-4 text-primary" />
								)}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem className="gap-2 p-2" disabled>
							<div className="flex size-6 items-center justify-center rounded-md border bg-background">
								<Building2 className="size-4" />
							</div>
							<div className="font-medium text-muted-foreground">
								Add organisation
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
