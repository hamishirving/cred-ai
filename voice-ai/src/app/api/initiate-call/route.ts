import { type NextRequest, NextResponse } from "next/server";
import { VapiClient } from "@vapi-ai/server-sdk";
import type { CallRequest, CallResponse } from "@/types/call";

export async function POST(
  req: NextRequest
): Promise<NextResponse<CallResponse>> {
  try {
    // Validate environment variables
    const apiKey = process.env.VAPI_API_KEY;
    const assistantId = process.env.VAPI_ASSISTANT_ID;
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

    if (!apiKey || !assistantId || !phoneNumberId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing VAPI configuration. Please check environment variables.",
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body: CallRequest = await req.json();
    const {
      candidateName,
      jobTitle,
      companyName,
      timeEstimate,
      callbackNumber,
      employerPhoneNumber,
    } = body;

    // Validate required fields
    if (!candidateName || !jobTitle || !companyName || !employerPhoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: candidateName, jobTitle, companyName, or employerPhoneNumber",
        },
        { status: 400 }
      );
    }

    // Validate phone number format (basic E.164 check)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(employerPhoneNumber)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid phone number format. Please use E.164 format (e.g., +44xxxxxxxxxx)",
        },
        { status: 400 }
      );
    }

    // Initialize VAPI server client
    const vapi = new VapiClient({ token: apiKey });

    // Prepare variable values for the assistant
    const variableValues: Record<string, string> = {
      candidateName,
      jobTitle,
      companyName,
    };

    if (timeEstimate) variableValues.timeEstimate = timeEstimate;
    if (callbackNumber) variableValues.callbackNumber = callbackNumber;

    // Initiate the call using server SDK
    const call = await vapi.calls.create({
      assistantId,
      assistantOverrides: {
        variableValues,
      },
      customer: {
        number: employerPhoneNumber,
      },
      phoneNumberId,
    });

    // Handle response - can be Call or CallBatchResponse
    const callId = "id" in call ? call.id : undefined;

    if (!callId) {
      throw new Error("Failed to get call ID from response");
    }

    return NextResponse.json({
      success: true,
      callId,
    });
  } catch (error) {
    console.error("Error initiating call:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: `Failed to initiate call: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
