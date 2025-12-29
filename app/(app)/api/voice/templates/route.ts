import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ChatSDKError } from "@/lib/errors";
import { listTemplates } from "@/lib/voice";

// ============================================
// GET /api/voice/templates - List available templates
// ============================================

export async function GET() {
	try {
		// 1. Check authentication
		const session = await auth();
		if (!session?.user) {
			return new ChatSDKError("unauthorized:chat").toResponse();
		}

		// 2. Get all templates
		const templates = listTemplates();

		// 3. Return templates (excluding sensitive data like assistant IDs)
		return NextResponse.json({
			templates: templates.map((template) => ({
				slug: template.slug,
				name: template.name,
				description: template.description,
				contextSchema: template.contextSchema,
				captureSchema: template.captureSchema,
				ui: template.ui,
			})),
		});
	} catch (error) {
		console.error("Error listing templates:", error);

		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}

		return NextResponse.json(
			{
				success: false,
				error: "Failed to list templates",
			},
			{ status: 500 },
		);
	}
}
