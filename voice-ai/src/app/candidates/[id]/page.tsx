import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InitiateCallButton } from "@/components/initiate-call-button";
import { CallHistory } from "@/components/call-history";
import candidatesData from "@/data/candidates.json";
import type { CandidatesData } from "@/types/candidate";

const data = candidatesData as CandidatesData;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CandidateDetailPage({ params }: PageProps) {
  const { id } = await params;
  const candidate = data.candidates.find((c) => c.id === id);

  if (!candidate) {
    notFound();
  }

  const recentWorkHistory = candidate.workHistory.slice(0, 2);

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-6">
        <Link href="/candidates">
          <Button variant="outline" className="mb-4">
            ← Back to Candidates
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">{candidate.candidateName}</h1>
        <p className="text-muted-foreground">
          Reference check for {candidate.currentApplication.jobTitle} position
        </p>
      </div>

      <div className="grid gap-6">
        {/* Current Application */}
        <Card>
          <CardHeader>
            <CardTitle>Current Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Position</p>
                <p className="font-medium">
                  {candidate.currentApplication.jobTitle}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-medium">
                  {candidate.currentApplication.companyName}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Application Date
                </p>
                <p className="font-medium">
                  {new Date(
                    candidate.currentApplication.applicationDate
                  ).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work History with References */}
        <Card>
          <CardHeader>
            <CardTitle>Work History & References</CardTitle>
            <CardDescription>
              Most recent positions with reference contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {recentWorkHistory.map((work, index) => (
              <div
                key={work.id}
                className={`pb-6 ${
                  index < recentWorkHistory.length - 1
                    ? "border-b border-border"
                    : ""
                }`}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{work.jobTitle}</h3>
                  <p className="text-muted-foreground">{work.companyName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(work.startDate).toLocaleDateString("en-GB", {
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    -{" "}
                    {new Date(work.endDate).toLocaleDateString("en-GB", {
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    • {work.employmentType}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium mb-1">Responsibilities</p>
                  <p className="text-sm text-muted-foreground">
                    {work.responsibilities}
                  </p>
                </div>

                {work.referenceContact ? (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium mb-3">
                      Reference Contact
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-medium">
                          {work.referenceContact.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Relationship</p>
                        <p className="font-medium">
                          {work.referenceContact.relationship}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Phone</p>
                        <p className="font-medium">
                          {work.referenceContact.phoneNumber}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium">
                          {work.referenceContact.email}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <InitiateCallButton
                        candidateName={candidate.candidateName}
                        jobTitle={candidate.currentApplication.jobTitle}
                        companyName={candidate.currentApplication.companyName}
                        employerPhoneNumber={work.referenceContact.phoneNumber}
                        workHistoryJobTitle={work.jobTitle}
                        workHistoryCompanyName={work.companyName}
                        workHistoryStartDate={work.startDate}
                        workHistoryEndDate={work.endDate}
                        workHistoryEmploymentType={work.employmentType}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/30 rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">
                      No reference contact available for this position
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Call History */}
        <CallHistory candidateName={candidate.candidateName} />

        {/* Full Work History */}
        {candidate.workHistory.length > 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Work History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidate.workHistory.slice(2).map((work) => (
                <div key={work.id} className="border-l-2 border-muted pl-4">
                  <h3 className="font-semibold">{work.jobTitle}</h3>
                  <p className="text-sm text-muted-foreground">
                    {work.companyName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(work.startDate).toLocaleDateString("en-GB", {
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    -{" "}
                    {new Date(work.endDate).toLocaleDateString("en-GB", {
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    • {work.employmentType}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
