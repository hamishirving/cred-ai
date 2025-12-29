import { Search } from "lucide-react";

export default function SearchPage() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<Search className="h-12 w-12 text-muted-foreground" />
			<h1 className="text-2xl font-semibold">Search</h1>
			<p className="text-muted-foreground text-center max-w-md">
				Global search across candidates, evidence, and activities.
			</p>
		</div>
	);
}
