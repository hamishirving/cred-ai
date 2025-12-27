"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";

interface CallArtifact {
  recordingUrl?: string;
  transcript?: string;
  structuredOutputs?: Record<string, unknown>;
  messages?: unknown[];
}

interface CallResultsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifact: CallArtifact | null;
  candidateName: string;
  workHistoryJobTitle: string;
  workHistoryCompanyName: string;
  workHistoryStartDate: string;
  workHistoryEndDate: string;
  workHistoryEmploymentType: string;
}

// Helper to format values
const formatValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value.replace(/_/g, " ");
  }
  return String(value);
};

// Helper to parse transcript into messages
const parseTranscript = (transcript: string) => {
  const lines = transcript.split("\n");
  const messages: { speaker: string; text: string }[] = [];
  let currentSpeaker = "";
  let currentText = "";

  for (const line of lines) {
    if (line.startsWith("AI:") || line.startsWith("User:")) {
      if (currentSpeaker && currentText) {
        messages.push({ speaker: currentSpeaker, text: currentText.trim() });
      }
      const [speaker, ...rest] = line.split(":");
      currentSpeaker = speaker;
      currentText = rest.join(":").trim();
    } else if (line.trim()) {
      currentText += " " + line.trim();
    }
  }

  if (currentSpeaker && currentText) {
    messages.push({ speaker: currentSpeaker, text: currentText.trim() });
  }

  return messages;
};

export function CallResultsSheet({
  open,
  onOpenChange,
  artifact,
  candidateName,
  workHistoryJobTitle,
  workHistoryCompanyName,
  workHistoryStartDate,
  workHistoryEndDate,
  workHistoryEmploymentType,
}: CallResultsSheetProps) {
  if (!artifact) {
    return null;
  }

  // Extract structured outputs
  const structuredData = artifact.structuredOutputs || {};
  const firstKey = Object.keys(structuredData)[0];
  const referenceDetails = firstKey
    ? (structuredData[firstKey] as {
        name?: string;
        result?: Record<string, unknown>;
      })
    : null;

  const confirmedData = referenceDetails?.result || {};

  // Original data from work history
  const originalData: Record<string, string> = {
    job_title: workHistoryJobTitle,
    company_name: workHistoryCompanyName,
    start_date: new Date(workHistoryStartDate).toLocaleDateString("en-CA"),
    end_date: new Date(workHistoryEndDate).toLocaleDateString("en-CA"),
    employment_type: workHistoryEmploymentType,
  };

  // Helper function to format date to YYYY-MM for comparison
  const formatMonthYear = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  };

  // Helper function to normalize strings for comparison
  const normalizeString = (str: string): string => {
    return str.toLowerCase().replace(/[^a-z0-9]/g, "");
  };

  // Helper function to check if job titles match (contains check)
  const jobTitlesMatch = (original: string, confirmed: string): boolean => {
    const normalizedOriginal = normalizeString(original);
    const normalizedConfirmed = normalizeString(confirmed);
    return (
      normalizedOriginal.includes(normalizedConfirmed) ||
      normalizedConfirmed.includes(normalizedOriginal)
    );
  };

  // Helper function to check if dates match (month and year only)
  const datesMatch = (original: string, confirmed: string): boolean => {
    return formatMonthYear(original) === formatMonthYear(confirmed);
  };

  // Map confirmed fields to original fields with custom match logic
  const comparisonRows = [
    {
      field: "Job Title",
      original: originalData.job_title,
      confirmed: formatValue(confirmedData.confirmed_jobTitle),
      matchFunction: jobTitlesMatch,
    },
    {
      field: "Company Name",
      original: originalData.company_name,
      confirmed: formatValue(confirmedData.confirmed_companyName),
      matchFunction: (a: string, b: string) =>
        normalizeString(a) === normalizeString(b),
    },
    {
      field: "Start Date",
      original: originalData.start_date,
      confirmed: formatValue(confirmedData.confirmed_startDate),
      matchFunction: datesMatch,
    },
    {
      field: "End Date",
      original: originalData.end_date,
      confirmed: formatValue(confirmedData.confirmed_endDate),
      matchFunction: datesMatch,
    },
    {
      field: "Employment Type",
      original: originalData.employment_type,
      confirmed: formatValue(confirmedData.confirmed_employmentType),
      matchFunction: (a: string, b: string) =>
        normalizeString(a) === normalizeString(b),
    },
    {
      field: "Reason for Leaving",
      original: "-",
      confirmed: formatValue(confirmedData.confirmed_reasonForLeaving),
      matchFunction: () => false, // No comparison for new data
    },
    {
      field: "Reemployment Eligible",
      original: "-",
      confirmed: formatValue(confirmedData.reemploymentEligible),
      matchFunction: () => false, // No comparison for new data
    },
  ].filter((row) => row.confirmed && row.confirmed !== "undefined");

  const messages = artifact.transcript
    ? parseTranscript(artifact.transcript)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6 px-6 pt-6">
          <SheetTitle>Reference Call Results</SheetTitle>
          <SheetDescription>
            Reference verification for {candidateName}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-6">
          {/* Comparison Table */}
          {comparisonRows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Employment Verification</CardTitle>
                <CardDescription>
                  Comparison of provided information with confirmed details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Provided Information</TableHead>
                      <TableHead>Confirmed Details</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonRows.map((row) => {
                      const isMatch =
                        row.original !== "-" &&
                        row.matchFunction(row.original, row.confirmed);
                      return (
                        <TableRow key={row.field}>
                          <TableCell className="font-medium">
                            {row.field}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {row.original}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.confirmed}
                          </TableCell>
                          <TableCell>
                            {row.original !== "-" &&
                              (isMatch ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-amber-600" />
                              ))}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Transcript */}
          {messages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Call Transcript</CardTitle>
                <CardDescription>Full conversation recording</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto p-4 bg-muted/30 rounded-md">
                  {messages.map((msg, index) => (
                    <div key={`${msg.speaker}-${index}`} className="space-y-1">
                      <div
                        className={`text-xs font-semibold ${
                          msg.speaker === "AI"
                            ? "text-blue-600"
                            : "text-green-600"
                        }`}
                      >
                        {msg.speaker === "AI" ? "Assistant" : "Reference"}
                      </div>
                      <div className="text-sm leading-relaxed">{msg.text}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([artifact.transcript || ""], {
                        type: "text/plain",
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${candidateName.replace(
                        /\s+/g,
                        "_"
                      )}_transcript.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download Transcript
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audio Recording */}
          {artifact.recordingUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Call Recording</CardTitle>
                <CardDescription>Audio playback and download</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <audio controls className="w-full">
                  <source src={artifact.recordingUrl} type="audio/mpeg" />
                  <track kind="captions" label="No captions available" />
                  Your browser does not support the audio element.
                </audio>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={artifact.recordingUrl}
                    download={`${candidateName.replace(
                      /\s+/g,
                      "_"
                    )}_recording.mp3`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download Recording
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
