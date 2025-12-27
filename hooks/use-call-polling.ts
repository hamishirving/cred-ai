"use client";

import { useState, useEffect, useCallback } from "react";

interface CallArtifact {
	recordingUrl?: string;
	transcript?: string;
	structuredOutputs?: Record<string, unknown>;
	messages?: unknown[];
}

interface CallStatusData {
	success: boolean;
	status?: string;
	artifact?: CallArtifact;
	error?: string;
}

interface UseCallPollingResult {
	status: string | null;
	artifact: CallArtifact | null;
	isPolling: boolean;
	error: string | null;
	stopPolling: () => void;
}

export function useCallPolling(
	callId: string | null,
	options: {
		interval?: number;
		maxAttempts?: number;
		enabled?: boolean;
	} = {},
): UseCallPollingResult {
	const {
		interval = 5000, // 5 seconds
		maxAttempts = 120, // 10 minutes max (120 * 5s)
		enabled = true,
	} = options;

	const [status, setStatus] = useState<string | null>(null);
	const [artifact, setArtifact] = useState<CallArtifact | null>(null);
	const [isPolling, setIsPolling] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const stopPolling = useCallback(() => {
		setIsPolling(false);
	}, []);

	useEffect(() => {
		if (!callId || !enabled) {
			return;
		}

		setIsPolling(true);
		setError(null);
		let attemptCount = 0;

		const pollCallStatus = async () => {
			try {
				const response = await fetch(`/api/voice/calls/${callId}/status`);
				const data: CallStatusData = await response.json();

				if (!data.success) {
					setError(data.error || "Failed to fetch call status");
					setIsPolling(false);
					return;
				}

				setStatus(data.status || null);

				// If call has ended, get the artifact data
				if (data.status === "ended" && data.artifact) {
					setArtifact(data.artifact);
					setIsPolling(false);
				}
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to fetch call status",
				);
				setIsPolling(false);
			}
		};

		// Initial fetch
		pollCallStatus();

		// Set up polling interval
		const intervalId = setInterval(() => {
			attemptCount++;

			// Stop polling if max attempts reached
			if (attemptCount >= maxAttempts) {
				setIsPolling(false);
				setError("Polling timeout reached");
				clearInterval(intervalId);
				return;
			}

			// Continue polling if call hasn't ended
			if (status !== "ended") {
				pollCallStatus();
			} else {
				clearInterval(intervalId);
			}
		}, interval);

		// Cleanup
		return () => {
			clearInterval(intervalId);
		};
	}, [callId, enabled, interval, maxAttempts, status]);

	return {
		status,
		artifact,
		isPolling,
		error,
		stopPolling,
	};
}
