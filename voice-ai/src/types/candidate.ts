export interface ReferenceContact {
  name: string;
  phoneNumber: string;
  relationship: string;
  email: string;
}

export interface WorkHistoryItem {
  id: string;
  companyName: string;
  jobTitle: string;
  employmentType: "full-time" | "part-time" | "contract";
  startDate: string;
  endDate: string;
  responsibilities: string;
  referenceContact: ReferenceContact | null;
}

export interface CurrentApplication {
  jobTitle: string;
  companyName: string;
  applicationDate: string;
}

export interface Candidate {
  id: string;
  candidateName: string;
  currentApplication: CurrentApplication;
  workHistory: WorkHistoryItem[];
}

export interface CandidatesData {
  candidates: Candidate[];
}
