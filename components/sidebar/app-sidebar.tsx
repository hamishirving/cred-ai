"use client";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";
import type { User } from "@/lib/types/auth";
import { NavCore } from "./nav-core";
import { NavUser } from "./nav-user";
// import { NavWorkspace } from "./nav-workspace";
import { OrgSwitcher } from "./org-switcher";

interface AppSidebarProps {
	user: User | undefined;
}

export function AppSidebar({ user }: AppSidebarProps) {
	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<OrgSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<NavCore />
				{/* <NavWorkspace /> */}
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
