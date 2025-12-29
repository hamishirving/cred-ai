import { Settings } from "lucide-react";
import Link from "next/link";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const settingsSections = [
	{
		title: "Organisation",
		description: "Name, branding, preferences",
		href: "/settings/organisation",
	},
	{
		title: "Users",
		description: "Invite users, assign roles",
		href: "/settings/users",
	},
	{
		title: "Roles",
		description: "Define roles and permissions",
		href: "/settings/roles",
	},
	{
		title: "Compliance",
		description: "Compliance elements, packages, rules",
		href: "/settings/compliance",
	},
	{
		title: "Pipelines",
		description: "Onboarding stages, automation",
		href: "/settings/pipelines",
	},
	{
		title: "Integrations",
		description: "API keys, external connections",
		href: "/settings/integrations",
	},
];

export default function SettingsPage() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex items-center gap-3">
				<Settings className="h-8 w-8" />
				<h1 className="text-2xl font-semibold">Settings</h1>
			</div>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{settingsSections.map((section) => (
					<Link key={section.href} href={section.href}>
						<Card className="hover:border-primary/50 transition-colors h-full">
							<CardHeader>
								<CardTitle className="text-lg">{section.title}</CardTitle>
								<CardDescription>{section.description}</CardDescription>
							</CardHeader>
						</Card>
					</Link>
				))}
			</div>
		</div>
	);
}
