export interface StoredCallResult {
  callId: string;
  candidateName: string;
  candidateId?: string;
  timestamp: string;
  status: string;
  artifact: {
    recordingUrl?: string;
    transcript?: string;
    structuredOutputs?: Record<string, unknown>;
    messages?: unknown[];
  };
  workHistory: {
    jobTitle: string;
    companyName: string;
    startDate: string;
    endDate: string;
    employmentType: string;
  };
}

export interface CallStorageData {
  calls: StoredCallResult[];
}
