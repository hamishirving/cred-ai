import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { ChatSDKError } from "@/lib/errors";
import {
	createVoiceCall,
	listVoiceCalls,
	type ListVoiceCallsParams,
} from "@/lib/db/queries";
import {
	getTemplate,
	validateContext,
	isValidPhoneNumber,
	initiateCall,
	isVapiConfigured,
	getMissingConfig,
} from "@/lib/voice";
import { updateVoiceCall } from "@/lib/db/queries";

// ============================================
// POST /api/voice/calls - Create a new call
// ============================================

const createCallSchema = z.object({
	templateSlug: z.string().min(1),
	phoneNumber: z.string().min(1),
	recipientName: z.string().optional(),
	context: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
	try {
		// 1. Check authentication
		const session = await auth();
		if (!session?.user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		// 2. Check VAPI configuration
		if (!isVapiConfigured()) {
			const missing = getMissingConfig();
			console.error("VAPI not configured, missing:", missing);
			return NextResponse.json(
				{
					success: false,
					error: `Voice service not configured. Missing: ${missing.join(", ")}`,
				},
				{ status: 500 },
			);
		}

		// 3. Parse and validate request body
		const body = await request.json();
		const parsed = createCallSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid request body",
					details: parsed.error.flatten(),
				},
				{ status: 400 },
			);
		}

		const { templateSlug, phoneNumber, recipientName, context } = parsed.data;

		// 4. Validate template exists
		const template = getTemplate(templateSlug);
		if (!template) {
			return NextResponse.json(
				{
					success: false,
					error: `Template "${templateSlug}" not found`,
				},
				{ status: 400 },
			);
		}

		// 5. Validate phone number format
		if (!isValidPhoneNumber(phoneNumber)) {
			return NextResponse.json(
				{
					success: false,
					error:
						"Invalid phone number format. Use E.164 format (e.g., +44xxxxxxxxxx)",
				},
				{ status: 400 },
			);
		}

		// 6. Validate context against template schema
		const contextErrors = validateContext(template, context);
		if (contextErrors.length > 0) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid context",
					details: contextErrors,
				},
				{ status: 400 },
			);
		}

		// 7. Create database record
		const voiceCall = await createVoiceCall({
			userId: session.user.id,
			templateSlug,
			phoneNumber,
			recipientName,
			context,
			vapiAssistantId: template.vapiAssistantId,
		});

		// 8. Initiate VAPI call
		try {
			// Convert context to string values for VAPI
			const variables: Record<string, string> = {};
			for (const [key, value] of Object.entries(context)) {
				if (value !== undefined && value !== null) {
					variables[key] = String(value);
				}
			}

			const vapiResult = await initiateCall({
				assistantId: template.vapiAssistantId,
				phoneNumber,
				variables,
			});

			// Update record with VAPI call ID
			await updateVoiceCall({
				id: voiceCall.id,
				vapiCallId: vapiResult.vapiCallId,
				status: "queued",
			});

			return NextResponse.json({
				success: true,
				call: {
					id: voiceCall.id,
					status: "queued",
				},
			});
		} catch (vapiError) {
			// VAPI call failed - update record and return error
			await updateVoiceCall({
				id: voiceCall.id,
				status: "failed",
				outcome: "failed",
			});

			console.error("VAPI call initiation failed:", vapiError);
			return NextResponse.json(
				{
					success: false,
					error:
						vapiError instanceof Error
							? vapiError.message
							: "Failed to initiate call",
					callId: voiceCall.id,
				},
				{ status: 500 },
			);
		}
	} catch (error) {
		console.error("Error creating voice call:", error);

		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}

		return NextResponse.json(
			{
				success: false,
				error: "Failed to create voice call",
			},
			{ status: 500 },
		);
	}
}

// ============================================
// GET /api/voice/calls - List calls
// ============================================

const listCallsSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	templateSlug: z.string().optional(),
	status: z
		.enum(["pending", "queued", "ringing", "in-progress", "ended", "failed"])
		.optional(),
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional(),
});

export async function GET(request: NextRequest) {
	try {
		// 1. Check authentication
		const session = await auth();
		if (!session?.user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		// 2. Parse query parameters
		const searchParams = request.nextUrl.searchParams;
		const parsed = listCallsSchema.safeParse({
			page: searchParams.get("page") ?? 1,
			limit: searchParams.get("limit") ?? 20,
			templateSlug: searchParams.get("templateSlug") ?? undefined,
			status: searchParams.get("status") ?? undefined,
			from: searchParams.get("from") ?? undefined,
			to: searchParams.get("to") ?? undefined,
		});

		if (!parsed.success) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid query parameters",
					details: parsed.error.flatten(),
				},
				{ status: 400 },
			);
		}

		const { page, limit, templateSlug, status, from, to } = parsed.data;

		// 3. Fetch calls
		const params: ListVoiceCallsParams = {
			userId: session.user.id,
			templateSlug,
			status,
			from,
			to,
			limit,
			offset: (page - 1) * limit,
		};

		const result = await listVoiceCalls(params);

		// 4. Return paginated response
		return NextResponse.json({
			calls: result.calls.map((call) => ({
				id: call.id,
				templateSlug: call.templateSlug,
				phoneNumber: call.phoneNumber,
				recipientName: call.recipientName,
				status: call.status,
				outcome: call.outcome,
				duration: call.duration,
				createdAt: call.createdAt.toISOString(),
				endedAt: call.endedAt?.toISOString(),
			})),
			pagination: {
				page,
				limit,
				total: result.total,
				totalPages: Math.ceil(result.total / limit),
			},
		});
	} catch (error) {
		console.error("Error listing voice calls:", error);

		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}

		return NextResponse.json(
			{
				success: false,
				error: "Failed to list voice calls",
			},
			{ status: 500 },
		);
	}
}
