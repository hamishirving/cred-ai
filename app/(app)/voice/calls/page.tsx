import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { listVoiceCalls } from "@/lib/db/queries";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallCard } from "@/components/voice/call-card";
import { Phone, ChevronLeft, PhoneCall, Users } from "lucide-react";

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
	const limit = 10;

	const result = await listVoiceCalls({
		userId: session.user.id,
		limit,
		offset: (page - 1) * limit,
	});

	const totalPages = Math.ceil(result.total / limit);

	return (
		<div className="flex flex-col min-h-svh">
			<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/voice">
						<ChevronLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div className="flex items-center gap-2">
					<Phone className="h-5 w-5" />
					<h1 className="font-semibold">All Calls</h1>
				</div>
				<div className="ml-auto">
					<Button asChild>
						<Link href="/voice/demo">
							<PhoneCall className="mr-2 h-4 w-4" />
							New Call
						</Link>
					</Button>
				</div>
			</header>

			<main className="flex-1 p-4 md:p-6">
				<div className="max-w-4xl mx-auto space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Call History</CardTitle>
							<CardDescription>
								{result.total} total call{result.total !== 1 ? "s" : ""}
							</CardDescription>
						</CardHeader>
						<CardContent>
							{result.calls.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
									<p>No calls yet</p>
									<Button className="mt-4" asChild>
										<Link href="/voice/demo">Make Your First Call</Link>
									</Button>
								</div>
							) : (
								<div className="space-y-4">
									{result.calls.map((call) => (
										<CallCard
											key={call.id}
											id={call.id}
											templateSlug={call.templateSlug}
											phoneNumber={call.phoneNumber}
											recipientName={call.recipientName}
											status={call.status}
											outcome={call.outcome}
											duration={call.duration}
											createdAt={call.createdAt.toISOString()}
											endedAt={call.endedAt?.toISOString()}
											detailsHref={`/voice/calls/${call.id}`}
										/>
									))}
								</div>
							)}

							{/* Pagination */}
							{totalPages > 1 && (
								<div className="flex items-center justify-center gap-2 mt-6">
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
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
