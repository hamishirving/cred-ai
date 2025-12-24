const API_BASE = process.env.BACKEND_API_URL ?? "http://localhost:8000";
const API_KEY = process.env.BACKEND_API_KEY;

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
		this.name = "ApiError";
	}
}

export async function apiCall<T>(
	endpoint: string,
	options?: RequestInit,
): Promise<T> {
	const url = `${API_BASE}${endpoint}`;

	const res = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...(API_KEY && { Authorization: `Bearer ${API_KEY}` }),
			...options?.headers,
		},
	});

	if (!res.ok) {
		throw new ApiError(
			`API error: ${res.status} ${res.statusText}`,
			res.status,
		);
	}

	return res.json();
}
