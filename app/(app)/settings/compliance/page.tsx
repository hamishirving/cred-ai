import { ClipboardCheck } from "lucide-react";

export default function ComplianceSettingsPage() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<ClipboardCheck className="h-12 w-12 text-muted-foreground" />
			<h1 className="text-2xl font-semibold">Compliance Configuration</h1>
			<p className="text-muted-foreground text-center max-w-md">
				Compliance elements, packages, and assignment rules.
			</p>
		</div>
	);
}
