import { cookies } from "next/headers";
import { Building2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AICompanionSettings } from "@/components/settings/ai-companion-settings";
import { getOrganisationSettings } from "@/lib/ai/agents/compliance-companion/queries";

export default async function OrganisationSettingsPage() {
	// Get organisation ID from cookie
	const cookieStore = await cookies();
	const organisationId = cookieStore.get("selectedOrgId")?.value;

	if (!organisationId) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
				<Building2 className="h-12 w-12 text-muted-foreground" />
				<h1 className="text-2xl font-semibold">Organisation Settings</h1>
				<p className="text-muted-foreground text-center max-w-md">
					Please select an organisation first.
				</p>
			</div>
		);
	}

	// Get org data
	const org = await getOrganisationSettings(organisationId);

	if (!org) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
				<Building2 className="h-12 w-12 text-muted-foreground" />
				<h1 className="text-2xl font-semibold">Organisation Not Found</h1>
				<p className="text-muted-foreground text-center max-w-md">
					The selected organisation could not be found.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Link href="/settings">
					<Button variant="ghost" size="icon">
						<ArrowLeft className="h-4 w-4" />
					</Button>
				</Link>
				<div className="flex items-center gap-3">
					<Building2 className="h-8 w-8" />
					<div>
						<h1 className="text-2xl font-semibold">Organisation Settings</h1>
						<p className="text-muted-foreground">{org.name}</p>
					</div>
				</div>
			</div>

			{/* AI Companion Settings */}
			<AICompanionSettings
				organisationId={organisationId}
				organisationName={org.name}
				initialSettings={{
					aiCompanion: org.settings,
					complianceContact: org.settings.complianceContact,
				}}
			/>
		</div>
	);
}
