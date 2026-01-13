import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getAllCandidates, countReferences } from "@/data/demo/candidates";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
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
import { Phone, ChevronLeft, ChevronRight } from "lucide-react";

export default async function VoiceCandidatesPage() {
	const session = await auth();

	if (!session?.user) {
		redirect("/login");
	}

	const candidates = getAllCandidates();

	return (
		<div className="flex flex-col min-h-svh">
			<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/voice">
						<ChevronLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div className="flex items-center gap-2">
					<Phone className="h-5 w-5" />
					<h1 className="font-semibold">Select Candidate</h1>
				</div>
			</header>

			<main className="flex-1 p-4 md:p-6">
				<div className="max-w-5xl mx-auto space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Candidates</CardTitle>
							<CardDescription>
								Select a candidate to verify their employment history
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Candidate</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Applying For</TableHead>
										<TableHead>References</TableHead>
										<TableHead className="w-[80px]" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{candidates.map((candidate) => {
										const refs = countReferences(candidate.id);
										return (
											<TableRow key={candidate.id}>
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
													<Button size="sm" variant="ghost" asChild>
														<Link href={`/voice/candidates/${candidate.id}`}>
															View
															<ChevronRight className="ml-1 h-4 w-4" />
														</Link>
													</Button>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			</main>
		</div>
	);
}
