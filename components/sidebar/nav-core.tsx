"use client";

import {
	BarChart3,
	CheckSquare,
	Home,
	type LucideIcon,
	MessageSquare,
	Phone,
	Users,
	Bot,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTerminology } from "@/lib/hooks/use-terminology";

interface NavItem {
	title: string;
	url: string;
	icon: LucideIcon;
}

export function NavCore() {
	const pathname = usePathname();
	const terminology = useTerminology();

	const coreNavItems: NavItem[] = [
		{
			title: "Home",
			url: "/",
			icon: Home,
		},
		{
			title: "Chat",
			url: "/chat",
			icon: MessageSquare,
		},
		{
			title: "Tasks",
			url: "/tasks",
			icon: CheckSquare,
		},
		{
			title: terminology.candidates,
			url: "/candidates",
			icon: Users,
		},
		{
			title: "Agents",
			url: "/agents",
			icon: Bot,
		},
		{
			title: "Voice",
			url: "/voice",
			icon: Phone,
		},
		{
			title: "Reports",
			url: "/reports",
			icon: BarChart3,
		},
	];

	return (
		<SidebarGroup>
			<SidebarMenu>
				{coreNavItems.map((item) => {
					const isActive =
						pathname === item.url ||
						(item.url !== "/" && pathname.startsWith(item.url));

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
