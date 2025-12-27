"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallResultsSheet } from "@/components/call-results-sheet";
import { getCallsForCandidate } from "@/lib/call-storage";
import type { StoredCallResult } from "@/types/call-storage";
import { CheckCircle2, Clock } from "lucide-react";

interface CallHistoryProps {
  candidateName: string;
}

export function CallHistory({ candidateName }: CallHistoryProps) {
  const [calls, setCalls] = useState<StoredCallResult[]>([]);
  const [selectedCall, setSelectedCall] = useState<StoredCallResult | null>(
    null
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  // Function to load calls
  const loadCalls = useCallback(() => {
    const storedCalls = getCallsForCandidate(candidateName);
    setCalls(storedCalls);
  }, [candidateName]);

  useEffect(() => {
    // Load calls from local storage on mount
    loadCalls();

    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "reference_call_results") {
        loadCalls();
      }
    };

    // Listen for custom storage event (from same tab)
    const handleCustomStorageChange = () => {
      loadCalls();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageUpdated", handleCustomStorageChange);

    // Poll for changes every 2 seconds (fallback)
    const intervalId = setInterval(loadCalls, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "localStorageUpdated",
        handleCustomStorageChange
      );
      clearInterval(intervalId);
    };
  }, [loadCalls]);

  const handleViewCall = (call: StoredCallResult) => {
    setSelectedCall(call);
    setSheetOpen(true);
  };

  if (calls.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>
            Previous reference verification calls for this candidate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.callId}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    {call.status === "ended" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {call.workHistory.jobTitle}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {call.workHistory.companyName}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(call.timestamp).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewCall(call)}
                >
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCall && (
        <CallResultsSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          artifact={selectedCall.artifact}
          candidateName={selectedCall.candidateName}
          workHistoryJobTitle={selectedCall.workHistory.jobTitle}
          workHistoryCompanyName={selectedCall.workHistory.companyName}
          workHistoryStartDate={selectedCall.workHistory.startDate}
          workHistoryEndDate={selectedCall.workHistory.endDate}
          workHistoryEmploymentType={selectedCall.workHistory.employmentType}
        />
      )}
    </>
  );
}
