import { User } from "lucide-react";

export default async function CandidateDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<User className="h-12 w-12 text-muted-foreground" />
			<h1 className="text-2xl font-semibold">Candidate Profile</h1>
			<p className="text-muted-foreground text-center max-w-md">
				Candidate ID: {id}
			</p>
		</div>
	);
}
