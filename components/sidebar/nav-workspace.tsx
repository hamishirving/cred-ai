"use client";

import { BarChart3, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

const workspaceItems = [
	{
		title: "Candidates",
		url: "/candidates",
		icon: Users,
	},
	{
		title: "Reports",
		url: "/reports",
		icon: BarChart3,
	},
];

export function NavWorkspace() {
	const pathname = usePathname();

	return (
		<SidebarGroup>
			<SidebarGroupLabel>Workspace</SidebarGroupLabel>
			<SidebarMenu>
				{workspaceItems.map((item) => {
					const isActive = pathname.startsWith(item.url);

					return (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
								<Link href={item.url}>
									<item.icon />
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
