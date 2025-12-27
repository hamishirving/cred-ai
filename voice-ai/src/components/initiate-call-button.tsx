"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CallResultsSheet } from "@/components/call-results-sheet";
import { useCallPolling } from "@/hooks/use-call-polling";
import { saveCallResult, getCallsForCandidate } from "@/lib/call-storage";
import type { CallRequest, CallResponse } from "@/types/call";
import type { StoredCallResult } from "@/types/call-storage";

interface InitiateCallButtonProps {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  employerPhoneNumber: string;
  workHistoryJobTitle: string;
  workHistoryCompanyName: string;
  workHistoryStartDate: string;
  workHistoryEndDate: string;
  workHistoryEmploymentType: string;
}

export function InitiateCallButton({
  candidateName,
  jobTitle,
  companyName,
  employerPhoneNumber,
  workHistoryJobTitle,
  workHistoryCompanyName,
  workHistoryStartDate,
  workHistoryEndDate,
  workHistoryEmploymentType,
}: InitiateCallButtonProps) {
  const [isInitiating, setIsInitiating] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [existingCall, setExistingCall] = useState<StoredCallResult | null>(
    null
  );

  // Use polling hook
  const {
    status,
    artifact,
    isPolling,
    error: pollingError,
  } = useCallPolling(callId, {
    enabled: !!callId,
  });

  // Check for existing call on mount
  useEffect(() => {
    const storedCalls = getCallsForCandidate(candidateName);
    // Find a call that matches this specific work history
    const matchingCall = storedCalls.find(
      (call) =>
        call.workHistory.jobTitle === workHistoryJobTitle &&
        call.workHistory.companyName === workHistoryCompanyName
    );
    setExistingCall(matchingCall || null);
  }, [candidateName, workHistoryJobTitle, workHistoryCompanyName]);

  // Save call result to local storage when call completes
  useEffect(() => {
    if (status === "ended" && artifact && callId) {
      const callResult: StoredCallResult = {
        callId,
        candidateName,
        timestamp: new Date().toISOString(),
        status,
        artifact,
        workHistory: {
          jobTitle: workHistoryJobTitle,
          companyName: workHistoryCompanyName,
          startDate: workHistoryStartDate,
          endDate: workHistoryEndDate,
          employmentType: workHistoryEmploymentType,
        },
      };
      saveCallResult(callResult);
      setExistingCall(callResult); // Update existing call state
    }
  }, [
    status,
    artifact,
    callId,
    candidateName,
    workHistoryJobTitle,
    workHistoryCompanyName,
    workHistoryStartDate,
    workHistoryEndDate,
    workHistoryEmploymentType,
  ]);

  const handleInitiateCall = async () => {
    setIsInitiating(true);
    setMessage(null);
    setCallId(null);

    try {
      const requestData: CallRequest = {
        candidateName,
        jobTitle,
        companyName,
        timeEstimate: "5 minutes",
        callbackNumber: "+447780781414",
        employerPhoneNumber,
      };

      const response = await fetch("/api/initiate-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const result: CallResponse = await response.json();

      if (result.success && result.callId) {
        setCallId(result.callId);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to initiate call",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsInitiating(false);
    }
  };

  const handleCallAgain = () => {
    setCallId(null);
    setMessage(null);
    setExistingCall(null); // Clear existing call to show initiate flow
  };

  const handleViewExistingCall = () => {
    setSheetOpen(true);
  };

  // Get status display text
  const getStatusText = () => {
    if (isInitiating) return "Initiating Call...";
    if (isPolling) {
      switch (status) {
        case "queued":
          return "Call queued...";
        case "ringing":
          return "Ringing... 🔔";
        case "in-progress":
          return "Call in progress... 📞";
        default:
          return "Processing...";
      }
    }
    return "Initiate Reference Call";
  };

  const isLoading = isInitiating || isPolling;
  const isCallCompleted = status === "ended" && artifact;
  const hasExistingCall = existingCall && !callId; // Show existing call UI only if not currently in a call flow

  return (
    <>
      <div className="space-y-3">
        {hasExistingCall ? (
          // Show "View Details" and "Call Again" if there's an existing stored call
          <div className="space-y-2">
            <Button className="w-full" onClick={handleViewExistingCall}>
              View Call Details
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={handleCallAgain}
            >
              Call Again
            </Button>
          </div>
        ) : !isCallCompleted ? (
          // Show initiate button or loading state
          <>
            <Button
              className="w-full"
              onClick={handleInitiateCall}
              disabled={isLoading}
            >
              {getStatusText()}
            </Button>

            {isPolling && status && (
              <div className="text-sm text-muted-foreground text-center">
                Status: {status}
              </div>
            )}
          </>
        ) : (
          // Show view details after call just completed
          <div className="space-y-2">
            <Button className="w-full" onClick={() => setSheetOpen(true)}>
              View Call Details
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={handleCallAgain}
            >
              Call Again
            </Button>
          </div>
        )}

        {message && message.type === "error" && (
          <div className="p-3 rounded-md text-sm bg-red-50 text-red-800 border border-red-200">
            {message.text}
          </div>
        )}

        {pollingError && (
          <div className="p-3 rounded-md text-sm bg-red-50 text-red-800 border border-red-200">
            {pollingError}
          </div>
        )}
      </div>

      <CallResultsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        artifact={existingCall?.artifact || artifact}
        candidateName={candidateName}
        workHistoryJobTitle={workHistoryJobTitle}
        workHistoryCompanyName={workHistoryCompanyName}
        workHistoryStartDate={workHistoryStartDate}
        workHistoryEndDate={workHistoryEndDate}
        workHistoryEmploymentType={workHistoryEmploymentType}
      />
    </>
  );
}
