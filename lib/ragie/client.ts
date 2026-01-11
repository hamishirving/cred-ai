const RAGIE_API_URL = "https://api.ragie.ai";

export interface RetrieveParams {
	query: string;
	top_k?: number;
	rerank?: boolean;
	filter?: Record<string, unknown>;
	max_chunks_per_document?: number;
}

export interface DocumentMetadata {
	source_url?: string;
	document_type?: string;
	document_source?: string;
	[key: string]: unknown;
}

export interface ScoredChunk {
	text: string;
	score: number;
	id: string;
	index: number;
	document_id: string;
	document_name: string;
	document_metadata: DocumentMetadata;
	metadata: Record<string, unknown>;
	links: Record<string, { href: string; type: string }>;
}

export interface RetrievalResponse {
	scored_chunks: ScoredChunk[];
}

export async function retrieve(
	params: RetrieveParams,
): Promise<RetrievalResponse> {
	const apiKey = process.env.RAGIE_API_KEY;

	if (!apiKey) {
		throw new Error("RAGIE_API_KEY environment variable is not set");
	}

	const response = await fetch(`${RAGIE_API_URL}/retrievals`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify(params),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Ragie API error ${response.status}: ${errorText}`);
	}

	return response.json();
}
