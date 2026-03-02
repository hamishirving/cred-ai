/**
 * Twilio SMS Client
 *
 * Lightweight wrapper around Twilio's Messages REST API.
 * Uses direct HTTP requests to avoid adding another SDK dependency.
 */

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

export interface SendTwilioSmsParams {
	to: string;
	body: string;
	from?: string;
}

export interface SendTwilioSmsResult {
	sid: string;
	status: string;
	to: string;
	from: string | null;
	errorCode: number | null;
	errorMessage: string | null;
}

interface TwilioMessageResponse {
	sid?: string;
	status?: string;
	to?: string;
	from?: string | null;
	error_code?: number | null;
	error_message?: string | null;
	message?: string;
}

function getApiUrl(): string {
	if (!TWILIO_ACCOUNT_SID) {
		throw new Error("TWILIO_ACCOUNT_SID environment variable is not set");
	}
	return `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
}

function getAuthHeader(): string {
	if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
		throw new Error(
			"Twilio credentials are not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)",
		);
	}
	const encoded = Buffer.from(
		`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`,
	).toString("base64");
	return `Basic ${encoded}`;
}

/**
 * Validate E.164 phone number format.
 */
export function isValidPhoneNumber(phone: string): boolean {
	return /^\+[1-9]\d{1,14}$/.test(phone);
}

/**
 * Send a single SMS message via Twilio.
 */
export async function sendTwilioSms(
	params: SendTwilioSmsParams,
): Promise<SendTwilioSmsResult> {
	const apiUrl = getApiUrl();
	const authHeader = getAuthHeader();

	const body = new URLSearchParams();
	body.set("To", params.to);
	body.set("Body", params.body);

	const resolvedFrom = params.from || TWILIO_FROM_NUMBER;
	if (resolvedFrom) {
		body.set("From", resolvedFrom);
	} else if (TWILIO_MESSAGING_SERVICE_SID) {
		body.set("MessagingServiceSid", TWILIO_MESSAGING_SERVICE_SID);
	} else {
		throw new Error(
			"No sender configured. Set TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID.",
		);
	}

	const response = await fetch(apiUrl, {
		method: "POST",
		headers: {
			Authorization: authHeader,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: body.toString(),
	});

	const payload =
		((await response.json().catch(() => null)) as TwilioMessageResponse | null) ??
		{};

	if (!response.ok) {
		const message =
			payload.message ||
			payload.error_message ||
			`Twilio API request failed (${response.status})`;
		throw new Error(message);
	}

	if (!payload.sid || !payload.to || !payload.status) {
		throw new Error("Twilio response missing required fields");
	}

	return {
		sid: payload.sid,
		status: payload.status,
		to: payload.to,
		from: payload.from ?? null,
		errorCode: payload.error_code ?? null,
		errorMessage: payload.error_message ?? null,
	};
}
