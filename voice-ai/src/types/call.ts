export interface CallRequest {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  timeEstimate?: string;
  callbackNumber?: string;
  employerPhoneNumber: string;
}

export interface CallResponse {
  success: boolean;
  callId?: string;
  error?: string;
}
