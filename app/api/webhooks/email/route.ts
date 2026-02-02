/**
 * Inbound Email Webhook
 *
 * Receives inbound emails from Postmark and triggers the
 * inbound-email-responder agent to process and reply.
 *
 * Accepts both:
 * - Postmark inbound webhook format: { FromName, FromFull, Subject, TextBody, ... }
 * - Direct test format: { from, subject, text }
 */

import { NextResponse } from "next/server";
import { executeAgent } from "@/lib/ai/agents/runner";
import { getAgentDefinition } from "@/lib/ai/agents/registry";

/**
 * Parse a "From" header value like "Sarah Mitchell <sarah@example.com>"
 * into { name, email }.
 */
function parseFrom(from: string): { name: string; email: string } {
	const match = from.match(/^(.+?)\s*<([^>]+)>$/);
	if (match) {
		return { name: match[1].trim(), email: match[2].trim() };
	}
	return { name: from.trim(), email: from.trim() };
}

function triggerAgent(senderEmail: string, senderName: string, subject: string, bodyText: string) {
	const agent = getAgentDefinition("inbound-email-responder");
	if (!agent) {
		console.error("[email-webhook] Agent definition not found");
		return;
	}

	executeAgent(
		agent,
		{
			input: { senderEmail, senderName, subject, bodyText },
			orgId: "",
			userId: "",
			triggerType: "event",
		},
		{
			onStep: (step) => console.log(`[email-webhook] Step ${step.index}:`, step.toolName || step.type),
			onComplete: (result) => console.log("[email-webhook] Agent completed:", result.status, `(${result.durationMs}ms)`),
			onError: (error) => console.error("[email-webhook] Agent error:", error.message),
		},
	).catch((err) => console.error("[email-webhook] Unhandled agent error:", err));
}

/** HEAD/GET for Postmark webhook URL verification */
export async function GET() {
	return NextResponse.json({ status: "ok" });
}

export async function HEAD() {
	return new NextResponse(null, { status: 200 });
}

export async function POST(request: Request) {
	try {
		const text = await request.text();
		if (!text) {
			// Empty body (e.g. Postmark URL check)
			return NextResponse.json({ status: "ok" });
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let payload: any;
		try {
			payload = JSON.parse(text);
		} catch {
			console.log("[email-webhook] Non-JSON body received, returning 200");
			return NextResponse.json({ status: "ok" });
		}

		// Postmark inbound format
		if (payload.FromFull || payload.TextBody !== undefined) {
			const senderEmail: string = payload.FromFull?.Email || payload.From || "";
			const senderName: string = payload.FromFull?.Name || payload.FromName || senderEmail;
			const subject: string = payload.Subject || "(no subject)";
			const bodyText: string = payload.TextBody || payload.HtmlBody || "";

			console.log("[email-webhook] Postmark inbound from:", senderEmail, "subject:", subject);
			triggerAgent(senderEmail, senderName, subject, bodyText);
			return NextResponse.json({ received: true });
		}

		// Direct test format: { from, subject, text }
		const fromRaw: string = payload.from || "";
		const subject: string = payload.subject || "(no subject)";
		const bodyText: string = payload.text || payload.html || "";

		if (!fromRaw) {
			return NextResponse.json({ error: "Missing 'from' field" }, { status: 400 });
		}

		const { name: senderName, email: senderEmail } = parseFrom(fromRaw);
		console.log("[email-webhook] Direct test from:", senderEmail, "subject:", subject);

		triggerAgent(senderEmail, senderName, subject, bodyText);
		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("[email-webhook] Error processing webhook:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
