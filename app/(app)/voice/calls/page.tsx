import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { auth } from "@/lib/auth";
import { listVoiceCalls } from "@/lib/db/queries";
import { Card, CardContent } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CallStatusBadge } from "@/components/voice/call-status-badge";
import { PhoneCall, Users } from "lucide-react";

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default async function VoiceCallsPage({
	searchParams,
}: {
	searchParams: Promise<{ page?: string }>;
}) {
	const session = await auth();

	if (!session?.user) {
		redirect("/login");
	}

	const resolvedParams = await searchParams;
	const page = Math.max(1, Number.parseInt(resolvedParams.page || "1", 10));
	const limit = 20;

	const result = await listVoiceCalls({
		userId: session.user.id,
		limit,
		offset: (page - 1) * limit,
	});

	const totalPages = Math.ceil(result.total / limit);

	return (
		<div className="flex flex-1 flex-col gap-4 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Call History</h1>
					<p className="text-muted-foreground text-sm">
						{result.total} total call{result.total !== 1 ? "s" : ""}
					</p>
				</div>
				<Button asChild>
					<Link href="/voice/candidates">
						<PhoneCall className="mr-2 h-4 w-4" />
						New Call
					</Link>
				</Button>
			</div>

			{/* Calls Table */}
			{result.calls.length === 0 ? (
				<Card>
					<CardContent className="py-12">
						<div className="text-center text-muted-foreground">
							<Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p className="font-medium">No calls yet</p>
							<Button className="mt-4" asChild>
								<Link href="/voice/candidates">Make Your First Call</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			) : (
				<Card>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Recipient</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead>Template</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Duration</TableHead>
								<TableHead>Time</TableHead>
								<TableHead className="w-[80px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{result.calls.map((call) => (
								<TableRow key={call.id}>
									<TableCell className="font-medium">
										{call.recipientName || "—"}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{call.phoneNumber}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{call.templateSlug}
									</TableCell>
									<TableCell>
										<CallStatusBadge status={call.status} outcome={call.outcome} />
									</TableCell>
									<TableCell className="text-muted-foreground">
										{call.duration ? formatDuration(call.duration) : "—"}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{formatDistanceToNow(call.createdAt, { addSuffix: true })}
									</TableCell>
									<TableCell>
										<Button size="sm" variant="ghost" asChild>
											<Link href={`/voice/calls/${call.id}`}>View</Link>
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-center gap-2 p-4 border-t">
							<Button
								variant="outline"
								size="sm"
								disabled={page <= 1}
								asChild
							>
								<Link href={`/voice/calls?page=${page - 1}`}>
									Previous
								</Link>
							</Button>
							<span className="text-sm text-muted-foreground">
								Page {page} of {totalPages}
							</span>
							<Button
								variant="outline"
								size="sm"
								disabled={page >= totalPages}
								asChild
							>
								<Link href={`/voice/calls?page=${page + 1}`}>
									Next
								</Link>
							</Button>
						</div>
					)}
				</Card>
			)}
		</div>
	);
}
