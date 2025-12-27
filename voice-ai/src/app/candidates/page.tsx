import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import candidatesData from "@/data/candidates.json";
import type { CandidatesData } from "@/types/candidate";

const data = candidatesData as CandidatesData;

export default function CandidatesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Candidates</h1>
        <p className="text-muted-foreground">
          Manage reference checks for candidates
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Candidate Name</TableHead>
              <TableHead>Applied Position</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Application Date</TableHead>
              <TableHead className="text-center">References</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.candidates.map((candidate) => {
              const recentWorkHistory = candidate.workHistory.slice(0, 2);
              const referencesWithContact = recentWorkHistory.filter(
                (work) => work.referenceContact !== null
              );

              return (
                <TableRow key={candidate.id}>
                  <TableCell className="font-medium">
                    {candidate.candidateName}
                  </TableCell>
                  <TableCell>{candidate.currentApplication.jobTitle}</TableCell>
                  <TableCell>
                    {candidate.currentApplication.companyName}
                  </TableCell>
                  <TableCell>
                    {new Date(
                      candidate.currentApplication.applicationDate
                    ).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        referencesWithContact.length === 2
                          ? "bg-green-100 text-green-800"
                          : referencesWithContact.length === 1
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {referencesWithContact.length} of 2
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/candidates/${candidate.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
