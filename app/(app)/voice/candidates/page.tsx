"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAllCandidates, countReferences } from "@/data/demo/candidates";
import { Card } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ChevronRight, Users } from "lucide-react";

export default function VoiceCandidatesPage() {
	const router = useRouter();
	const candidates = getAllCandidates();

	return (
		<div className="flex flex-1 flex-col gap-4 p-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-semibold">Select Candidate</h1>
				<p className="text-muted-foreground text-sm">
					Choose a candidate to verify their employment history
				</p>
			</div>

			{/* Candidates Table */}
			{candidates.length === 0 ? (
				<Card className="py-12">
					<div className="text-center text-muted-foreground">
						<Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
						<p className="font-medium">No candidates available</p>
					</div>
				</Card>
			) : (
				<Card>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Candidate</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Applying For</TableHead>
								<TableHead>References</TableHead>
								<TableHead className="w-[40px]" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{candidates.map((candidate) => {
								const refs = countReferences(candidate.id);
								return (
									<TableRow
										key={candidate.id}
										className="cursor-pointer"
										onClick={() => router.push(`/voice/candidates/${candidate.id}`)}
									>
										<TableCell className="font-medium">
											{candidate.name}
										</TableCell>
										<TableCell className="text-muted-foreground">
											{candidate.email}
										</TableCell>
										<TableCell>
											<div>
												<div className="font-medium text-sm">
													{candidate.currentApplication.jobTitle}
												</div>
												<div className="text-xs text-muted-foreground">
													{candidate.currentApplication.companyName}
												</div>
											</div>
										</TableCell>
										<TableCell className="text-muted-foreground">
											{refs.available}/{refs.total} available
										</TableCell>
										<TableCell>
											<ChevronRight className="h-4 w-4 text-muted-foreground" />
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</Card>
			)}
		</div>
	);
}
