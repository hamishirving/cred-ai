import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/app/(auth)/auth";
import { getRecentVoiceCalls, getVoiceCallStats } from "@/lib/db/queries";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallCard } from "@/components/voice/call-card";
import { Phone, PhoneCall, PhoneOff, Clock, Users } from "lucide-react";

export default async function VoiceDashboardPage() {
	const session = await auth();

	if (!session?.user) {
		redirect("/login");
	}

	const [recentCalls, stats] = await Promise.all([
		getRecentVoiceCalls({ userId: session.user.id, limit: 5 }),
		getVoiceCallStats({ userId: session.user.id }),
	]);

	return (
		<div className="flex flex-col min-h-svh">
			<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
				<div className="flex items-center gap-2">
					<Phone className="h-5 w-5" />
					<h1 className="font-semibold">Voice AI</h1>
				</div>
				<div className="ml-auto flex items-center gap-2">
					<Button asChild>
						<Link href="/voice/demo">
							<PhoneCall className="mr-2 h-4 w-4" />
							New Call
						</Link>
					</Button>
				</div>
			</header>

			<main className="flex-1 p-4 md:p-6 space-y-6">
				{/* Stats Cards */}
				<div className="grid gap-4 md:grid-cols-4">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-sm font-medium">Total Calls</CardTitle>
							<Phone className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.total}</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-sm font-medium">Completed</CardTitle>
							<PhoneCall className="h-4 w-4 text-green-600" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.completed}</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-sm font-medium">Failed</CardTitle>
							<PhoneOff className="h-4 w-4 text-red-600" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.failed}</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-sm font-medium">In Progress</CardTitle>
							<Clock className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{stats.inProgress}</div>
						</CardContent>
					</Card>
				</div>

				{/* Recent Calls */}
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle>Recent Calls</CardTitle>
								<CardDescription>
									Your most recent voice AI calls
								</CardDescription>
							</div>
							<Button variant="outline" asChild>
								<Link href="/voice/calls">View All</Link>
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{recentCalls.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
								<p>No calls yet</p>
								<p className="text-sm mt-1">
									Start by making a demo call
								</p>
								<Button className="mt-4" asChild>
									<Link href="/voice/demo">Make Your First Call</Link>
								</Button>
							</div>
						) : (
							<div className="space-y-4">
								{recentCalls.map((call) => (
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
									/>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</main>
		</div>
	);
}
