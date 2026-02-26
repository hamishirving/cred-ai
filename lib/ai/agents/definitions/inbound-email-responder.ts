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

PROCESS ATTACHMENTS:
If the email has attachments, you MUST process each one before composing your reply:
1. Use storeAttachment with the attachmentIndex (from the input) to upload the file and get a signed URL
2. Use classifyDocument with the signed URL to identify the document type
3. Compare the classification against outstanding compliance items to find the best match
4. Use uploadDocumentEvidence to link the file to the matched compliance element
5. Use verifyDocumentEvidence to verify the document against acceptance criteria
6. Note the verification results — include them in your reply

When matching documents to compliance elements, use common sense:
- "titer_result" → likely matches MMR, Varicella, or Hep B elements
- "vaccination_record" → matches vaccination requirements (MMR, TDAP, COVID, Varicella)
- "screening_result" → likely matches TB Test
- "certificate" → likely matches BLS, ACLS, or other certification elements
If you can't confidently match a document, mention it in the reply and ask which requirement it's for.

COMPOSE REPLY:
Use draftEmail to send a reply. Pass organisationId explicitly.
- Be warm but concise
- Reference specific compliance information from the knowledgebase where relevant
- If attachments were processed, include the verification results (accepted/rejected with reasoning)
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
		"storeAttachment",
		"classifyDocument",
		"uploadDocumentEvidence",
		"verifyDocumentEvidence",
	],

	inputSchema: z.object({
		senderEmail: z
			.string()
			.email()
			.describe("Email address of the person who sent the inbound email"),
		senderName: z
			.string()
			.describe("Display name of the sender"),
		subject: z
			.string()
			.describe("Subject line of the inbound email"),
		bodyText: z
			.string()
			.describe("Plain text body of the inbound email"),
		attachments: z
			.array(
				z.object({
					fileName: z.string(),
					contentType: z.string(),
					base64Content: z.string(),
					contentLength: z.number(),
				}),
			)
			.optional()
			.default([])
			.describe("File attachments from the email"),
	}),

	constraints: {
		maxSteps: 30,
		maxExecutionTime: 120000,
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
