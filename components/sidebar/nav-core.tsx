"use client";

import { Bell, CheckSquare, Home, MessageSquare, Phone, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

const coreNavItems = [
	{
		title: "Home",
		url: "/",
		icon: Home,
	},
	{
		title: "Search",
		url: "/search",
		icon: Search,
	},
	{
		title: "Chat",
		url: "/chat",
		icon: MessageSquare,
	},
	{
		title: "Voice",
		url: "/voice",
		icon: Phone,
	},
	{
		title: "Tasks",
		url: "/tasks",
		icon: CheckSquare,
	},
	{
		title: "Notifications",
		url: "/notifications",
		icon: Bell,
	},
];

export function NavCore() {
	const pathname = usePathname();

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
