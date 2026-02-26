"use client";

import { Response } from "./elements/response";

export interface SmsData {
	recipientName?: string;
	recipientPhone: string;
	body: string;
	status?: string;
	sid?: string;
	from?: string | null;
	to?: string;
}

export function SmsMessageComponent({ sms }: { sms: SmsData }) {
	const status = sms.status ?? "unknown";
	const isFailed = status.toLowerCase() === "failed";

	return (
		<div className="w-[600px] max-w-full overflow-hidden rounded-xl border bg-card">
			<div className="border-b bg-muted/30 px-4 py-3">
				<div className="space-y-1.5 text-sm">
					<div className="flex gap-2">
						<span className="w-16 shrink-0 text-muted-foreground">To:</span>
						<span className="font-medium">{sms.recipientPhone}</span>
					</div>
					<div className="flex gap-2">
						<span className="w-16 shrink-0 text-muted-foreground">Status:</span>
						<span
							className={
								isFailed
									? "font-medium text-destructive"
									: "font-medium text-[var(--positive)]"
							}
						>
							{status}
						</span>
					</div>
				</div>
			</div>

			<div className="p-4">
				<div className="prose prose-sm dark:prose-invert max-w-none">
					<Response>{sms.body}</Response>
				</div>
			</div>
		</div>
	);
}
