import { type NextRequest, NextResponse } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";

interface CallStatusResponse {
  success: boolean;
  status?: string;
  artifact?: {
    recordingUrl?: string;
    transcript?: string;
    structuredOutputs?: Record<string, unknown>;
    messages?: unknown[];
  };
  error?: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
): Promise<NextResponse<CallStatusResponse>> {
  try {
    const { callId } = await params;

    // Validate environment variables
    const apiKey = process.env.VAPI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing VAPI API key configuration",
        },
        { status: 500 }
      );
    }

    // Initialize VAPI server client
    const vapi = new VapiClient({ token: apiKey });

    // Fetch call details
    const call = await vapi.calls.get(callId);

    return NextResponse.json({
      success: true,
      status: call.status,
      artifact: call.artifact
        ? {
            recordingUrl: call.artifact.recordingUrl,
            transcript: call.artifact.transcript,
            structuredOutputs: call.artifact.structuredOutputs,
            messages: call.artifact.messages,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Error fetching call status:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to fetch call status: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
