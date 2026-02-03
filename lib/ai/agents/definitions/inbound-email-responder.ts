/**
 * Inbound Email Responder Agent
 *
 * Triggered by Resend inbound email webhook. Reads the candidate's email,
 * looks up their profile and compliance status, searches the knowledgebase
 * for relevant information, and drafts a reply.
 */

import { z } from "zod";
import type { AgentDefinition } from "../types";

export const inboundEmailResponderAgent: AgentDefinition = {
	id: "inbound-email-responder",
	name: "Inbound Email Responder",
	description:
		"Receives inbound candidate emails, identifies the sender, checks their compliance status, searches the knowledgebase for relevant answers, and sends a helpful reply.",
	version: "1.0",

	systemPrompt: `You are responding to an inbound email from a candidate. Follow these steps methodically.

IDENTIFY CANDIDATE:
Use searchLocalCandidates with the sender's email address (do NOT pass organisationId — search across all orgs).
Note the organisationId from the result — you'll need it for draftEmail and createTask.
If no match is found, skip to COMPOSE REPLY with a polite response explaining you couldn't locate their record and suggesting they contact their recruiter.

LOAD CONTEXT:
Use getLocalProfile to get the candidate's full profile.
Use getLocalCompliance to check their current compliance status.

CHECK MEMORY:
Use getAgentMemory to check for any previous interactions with this candidate.

UNDERSTAND REQUEST:
Categorise the candidate's question. Common categories:
- Document status enquiry (DBS, references, right to work)
- Timeline question (how long something takes)
- Process question (what they need to do next)
- Update/change request (new address, name change)
- General enquiry

RESEARCH:
Use searchKnowledge to find relevant compliance requirements, policies, or guidance that help answer the candidate's question. This is critical — always search before replying so your answer is grounded in actual documentation.

COMPOSE REPLY:
Use draftEmail to send a reply. Pass organisationId explicitly.
- Be warm but concise
- Reference specific compliance information from the knowledgebase where relevant
- If their compliance record shows outstanding items, mention what's still needed
- Include the portal link if they need to take action: [Access your portal](https://portal.credentially.io)
- Never make up compliance requirements — only cite what you found in the knowledgebase

SAVE MEMORY:
Use saveAgentMemory to record this interaction — include the topic, what was asked, and how you responded.

ESCALATE IF NEEDED:
If the request requires human intervention (e.g. document re-upload, account changes, complex queries you can't answer), use createTask to flag it for the compliance team. Pass organisationId explicitly.
IMPORTANT: Never use "me" as the assignee — you are an automated agent with no user identity. Assign tasks to a specific team member by name (e.g. "Sarah" for compliance queries, "Marcus" for onboarding support).`,

	tools: [
		"searchLocalCandidates",
		"getLocalProfile",
		"getLocalCompliance",
		"searchKnowledge",
		"getAgentMemory",
		"saveAgentMemory",
		"draftEmail",
		"createTask",
	],

	inputSchema: z.object({
		senderEmail: z
			.string()
			.email()
			.default("sarah.thompson@email.com")
			.describe("Email address of the person who sent the inbound email"),
		senderName: z
			.string()
			.default("Sarah Thompson")
			.describe("Display name of the sender"),
		subject: z
			.string()
			.default("Question about my DBS check")
			.describe("Subject line of the inbound email"),
		bodyText: z
			.string()
			.default(
				"Hi, I uploaded my DBS certificate last week but I haven't heard anything back. Can you let me know what the status is and if there's anything else you need from me? Thanks, Sarah",
			)
			.describe("Plain text body of the inbound email"),
	}),

	constraints: {
		maxSteps: 16,
		maxExecutionTime: 90000,
	},

	trigger: {
		type: "event",
		description: "Triggered by inbound email webhook",
	},

	oversight: {
		mode: "notify-after",
	},

	dynamicContext: async (ctx) => {
		if (ctx.orgId) {
			return `Organisation ID: ${ctx.orgId}\nIMPORTANT: When calling draftEmail or createTask, always pass organisationId: "${ctx.orgId}" explicitly.`;
		}
		return `No organisation ID provided. After finding the candidate with searchLocalCandidates, use the organisationId from the result when calling draftEmail or createTask.`;
	},
};
