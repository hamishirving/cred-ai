import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallStatusBadge } from "./call-status-badge";
import type { VoiceCallStatus, VoiceCallOutcome } from "@/lib/voice/types";
import { Phone, Clock, User } from "lucide-react";

interface CallCardProps {
	id: string;
	templateSlug: string;
	phoneNumber: string;
	recipientName?: string | null;
	status: VoiceCallStatus;
	outcome?: VoiceCallOutcome | null;
	duration?: number | null;
	createdAt: string;
	endedAt?: string | null;
	detailsHref?: string;
}

function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CallCard({
	id,
	templateSlug,
	phoneNumber,
	recipientName,
	status,
	outcome,
	duration,
	createdAt,
	detailsHref,
}: CallCardProps) {
	const isActive = status === "ringing" || status === "in-progress";

	return (
		<Card className={isActive ? "border-green-200 bg-green-50/30" : undefined}>
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<CardTitle className="text-base">
							{recipientName || phoneNumber}
						</CardTitle>
						<CardDescription className="flex items-center gap-2">
							<Phone className="h-3 w-3" />
							{phoneNumber}
						</CardDescription>
					</div>
					<CallStatusBadge status={status} outcome={outcome} />
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4 text-sm text-muted-foreground">
						<span className="flex items-center gap-1">
							<Clock className="h-3 w-3" />
							{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
						</span>
						{duration !== null && duration !== undefined && (
							<span className="flex items-center gap-1">
								<User className="h-3 w-3" />
								{formatDuration(duration)}
							</span>
						)}
						<span className="text-xs bg-muted px-1.5 py-0.5 rounded">
							{templateSlug}
						</span>
					</div>
					{detailsHref && (
						<Button variant="ghost" size="sm" asChild>
							<Link href={detailsHref}>View Details</Link>
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
