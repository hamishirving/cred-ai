import { GitBranch } from "lucide-react";

export default function PipelinesSettingsPage() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<GitBranch className="h-12 w-12 text-muted-foreground" />
			<h1 className="text-2xl font-semibold">Pipeline Configuration</h1>
			<p className="text-muted-foreground text-center max-w-md">
				Onboarding stages and automation rules.
			</p>
		</div>
	);
}
