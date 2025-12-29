import { Plug } from "lucide-react";

export default function IntegrationsSettingsPage() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<Plug className="h-12 w-12 text-muted-foreground" />
			<h1 className="text-2xl font-semibold">Integrations</h1>
			<p className="text-muted-foreground text-center max-w-md">
				API keys and external connections.
			</p>
		</div>
	);
}
