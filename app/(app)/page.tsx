import { Home } from "lucide-react";

export default function HomePage() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<Home className="h-12 w-12 text-muted-foreground" />
			<h1 className="text-2xl font-semibold">Home</h1>
			<p className="text-muted-foreground text-center max-w-md">
				Dashboard landing page. Quick stats, pending actions, and AI activity highlights.
			</p>
		</div>
	);
}
