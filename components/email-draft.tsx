"use client";

import { CheckIcon, CopyIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import { Response } from "./elements/response";
import { Button } from "./ui/button";

interface EmailData {
	recipientName?: string;
	recipientEmail: string;
	subject: string;
	body: string;
	cc?: string;
}

type EmailDraftProps = {
	email: EmailData;
};

export function EmailDraftComponent({ email }: EmailDraftProps) {
	const [sending, setSending] = useState(false);
	const [sent, setSent] = useState(false);
	const [copied, setCopied] = useState(false);

	const handleSend = async () => {
		setSending(true);
		// Simulate sending - replace with actual ESP integration
		await new Promise((resolve) => setTimeout(resolve, 1500));
		setSending(false);
		setSent(true);
		console.log("Email sent:", email);
	};

	const handleCopy = async () => {
		const emailText = `To: ${email.recipientEmail}${email.cc ? `\nCC: ${email.cc}` : ""}\nSubject: ${email.subject}\n\n${email.body}`;
		await navigator.clipboard.writeText(emailText);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (sent) {
		return (
			<div className="w-[600px] max-w-full rounded-xl border bg-white p-6 dark:bg-card">
				<div className="flex flex-col items-center gap-3 text-center">
					<div className="flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
						<CheckIcon className="size-6" />
					</div>
					<h3 className="font-semibold text-lg">Email Sent!</h3>
					<p className="text-muted-foreground text-sm">
						Your email to {email.recipientEmail} has been sent successfully.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="w-[600px] max-w-full overflow-hidden rounded-xl border bg-white dark:bg-card">
			{/* Email Header */}
			<div className="border-b bg-muted/30 px-4 py-3">
				<div className="space-y-1.5 text-sm">
					<div className="flex gap-2">
						<span className="w-16 shrink-0 text-muted-foreground">To:</span>
						<span className="font-medium">{email.recipientEmail}</span>
					</div>
					{email.cc && (
						<div className="flex gap-2">
							<span className="w-16 shrink-0 text-muted-foreground">CC:</span>
							<span>{email.cc}</span>
						</div>
					)}
					<div className="flex gap-2">
						<span className="w-16 shrink-0 text-muted-foreground">
							Subject:
						</span>
						<span className="font-medium">{email.subject}</span>
					</div>
				</div>
			</div>

			{/* Email Body */}
			<div className="p-4">
				<div className="prose prose-sm dark:prose-invert max-w-none">
					<Response>{email.body}</Response>
				</div>
			</div>

			{/* Actions */}
			<div className="border-t bg-muted/30 px-4 py-3">
				<div className="flex items-center justify-between">
					<Button
						className="gap-2"
						onClick={handleCopy}
						size="sm"
						variant="outline"
					>
						{copied ? (
							<>
								<CheckIcon className="size-4" />
								Copied
							</>
						) : (
							<>
								<CopyIcon className="size-4" />
								Copy
							</>
						)}
					</Button>

					<Button
						className="gap-2"
						disabled={sending}
						onClick={handleSend}
						size="sm"
						style={{ backgroundColor: "var(--primary)" }}
					>
						{sending ? (
							<>
								<div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
								Sending...
							</>
						) : (
							<>
								<SendIcon className="size-4" />
								Send Email
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
