import type { StoredCallResult, CallStorageData } from "@/types/call-storage";

const STORAGE_KEY = "reference_call_results";

/**
 * Get all stored call results from local storage
 */
export function getStoredCalls(): StoredCallResult[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const parsed: CallStorageData = JSON.parse(data);
    return parsed.calls || [];
  } catch (error) {
    console.error("Error reading from local storage:", error);
    return [];
  }
}

/**
 * Get stored calls for a specific candidate
 */
export function getCallsForCandidate(
  candidateName: string
): StoredCallResult[] {
  const allCalls = getStoredCalls();
  return allCalls.filter((call) => call.candidateName === candidateName);
}

/**
 * Get a specific call by ID
 */
export function getCallById(callId: string): StoredCallResult | null {
  const allCalls = getStoredCalls();
  return allCalls.find((call) => call.callId === callId) || null;
}

/**
 * Save a new call result to local storage
 */
export function saveCallResult(callResult: StoredCallResult): void {
  if (typeof window === "undefined") return;

  try {
    const existingCalls = getStoredCalls();

    // Check if call already exists and update it, otherwise add new
    const existingIndex = existingCalls.findIndex(
      (call) => call.callId === callResult.callId
    );

    if (existingIndex >= 0) {
      existingCalls[existingIndex] = callResult;
    } else {
      existingCalls.unshift(callResult); // Add to beginning
    }

    const data: CallStorageData = { calls: existingCalls };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    // Dispatch custom event to notify components in the same tab
    window.dispatchEvent(new Event("localStorageUpdated"));
  } catch (error) {
    console.error("Error saving to local storage:", error);
  }
}

/**
 * Delete a call result from local storage
 */
export function deleteCallResult(callId: string): void {
  if (typeof window === "undefined") return;

  try {
    const existingCalls = getStoredCalls();
    const filteredCalls = existingCalls.filter(
      (call) => call.callId !== callId
    );

    const data: CallStorageData = { calls: filteredCalls };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error deleting from local storage:", error);
  }
}

/**
 * Clear all stored call results
 */
export function clearAllCallResults(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing local storage:", error);
  }
}
