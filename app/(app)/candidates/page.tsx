import { Users } from "lucide-react";

export default function CandidatesPage() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<Users className="h-12 w-12 text-muted-foreground" />
			<h1 className="text-2xl font-semibold">Candidates</h1>
			<p className="text-muted-foreground text-center max-w-md">
				Pipeline view showing candidates at various stages.
			</p>
		</div>
	);
}
