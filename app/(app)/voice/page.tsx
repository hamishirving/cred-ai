import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { auth } from "@/lib/auth";
import { getRecentVoiceCalls, getVoiceCallStats } from "@/lib/db/queries";
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
import { Phone, PhoneCall, PhoneOff, Clock, Users, Check } from "lucide-react";

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default async function VoiceDashboardPage() {
	const session = await auth();

	if (!session?.user) {
		redirect("/login");
	}

	const [recentCalls, stats] = await Promise.all([
		getRecentVoiceCalls({ userId: session.user.id, limit: 10 }),
		getVoiceCallStats({ userId: session.user.id }),
	]);

	return (
		<div className="flex flex-1 flex-col gap-4 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold">Voice AI</h1>
					<p className="text-muted-foreground text-sm">
						Automated reference verification calls
					</p>
				</div>
				<Button asChild>
					<Link href="/voice/candidates">
						<PhoneCall className="mr-2 h-4 w-4" />
						New Call
					</Link>
				</Button>
			</div>

			{/* Stats */}
			<div className="grid gap-3 md:grid-cols-4">
				<Card className="border-l-4 border-l-blue-500">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">Total Calls</p>
								<p className="text-xl font-bold">{stats.total}</p>
							</div>
							<Phone className="h-6 w-6 text-blue-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-green-500">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">Completed</p>
								<p className="text-xl font-bold">{stats.completed}</p>
							</div>
							<Check className="h-6 w-6 text-green-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-red-500">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">Failed</p>
								<p className="text-xl font-bold">{stats.failed}</p>
							</div>
							<PhoneOff className="h-6 w-6 text-red-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
				<Card className="border-l-4 border-l-yellow-500">
					<CardContent className="p-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-xs text-muted-foreground">In Progress</p>
								<p className="text-xl font-bold">{stats.inProgress}</p>
							</div>
							<Clock className="h-6 w-6 text-yellow-500 opacity-50" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Recent Calls */}
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-medium">Recent Calls</h2>
				<Button variant="outline" size="sm" asChild>
					<Link href="/voice/calls">View All</Link>
				</Button>
			</div>

			{recentCalls.length === 0 ? (
				<Card>
					<CardContent className="py-12">
						<div className="text-center text-muted-foreground">
							<Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p className="font-medium">No calls yet</p>
							<p className="text-sm mt-1">
								Start by selecting a candidate
							</p>
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
							</TableRow>
						</TableHeader>
						<TableBody>
							{recentCalls.map((call) => (
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
								</TableRow>
							))}
						</TableBody>
					</Table>
				</Card>
			)}
		</div>
	);
}
