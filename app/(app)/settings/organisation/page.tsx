import { Building2 } from "lucide-react";

export default function OrganisationSettingsPage() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<Building2 className="h-12 w-12 text-muted-foreground" />
			<h1 className="text-2xl font-semibold">Organisation Settings</h1>
			<p className="text-muted-foreground text-center max-w-md">
				Name, branding, and preferences.
			</p>
		</div>
	);
}
