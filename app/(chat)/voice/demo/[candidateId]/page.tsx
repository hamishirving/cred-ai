import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/app/(auth)/auth";
import { getCandidateById } from "@/data/demo/candidates";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Phone,
	ChevronLeft,
	User,
	Briefcase,
	Calendar,
	Building2,
	PhoneCall,
} from "lucide-react";

export default async function CandidateDetailPage({
	params,
}: {
	params: Promise<{ candidateId: string }>;
}) {
	const session = await auth();
	if (!session?.user) {
		redirect("/login");
	}

	const { candidateId } = await params;
	const candidate = getCandidateById(candidateId);

	if (!candidate) {
		notFound();
	}

	return (
		<div className="flex flex-col min-h-svh">
			<header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
				<Button variant="ghost" size="icon" asChild>
					<Link href="/voice/demo">
						<ChevronLeft className="h-4 w-4" />
					</Link>
				</Button>
				<div className="flex items-center gap-2">
					<User className="h-5 w-5" />
					<h1 className="font-semibold">{candidate.name}</h1>
				</div>
			</header>

			<main className="flex-1 p-4 md:p-6">
				<div className="max-w-4xl mx-auto space-y-6">
					{/* Candidate Info */}
					<Card>
						<CardHeader>
							<div className="flex items-center gap-4">
								<div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
									<User className="h-8 w-8 text-primary" />
								</div>
								<div>
									<CardTitle>{candidate.name}</CardTitle>
									<CardDescription>{candidate.email}</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex items-center gap-2 text-sm">
								<Briefcase className="h-4 w-4 text-muted-foreground" />
								<span className="text-muted-foreground">Applying for:</span>
								<span className="font-medium">
									{candidate.currentApplication.jobTitle}
								</span>
								<span className="text-muted-foreground">at</span>
								<span className="font-medium">
									{candidate.currentApplication.companyName}
								</span>
							</div>
						</CardContent>
					</Card>

					{/* Work History */}
					<div className="space-y-4">
						<h2 className="text-lg font-semibold">Employment History</h2>
						<p className="text-sm text-muted-foreground">
							Click on a role with a reference contact to initiate a verification
							call
						</p>

						{candidate.workHistory.map((work) => (
							<Card
								key={work.id}
								className={
									work.reference
										? "hover:border-primary/50 transition-colors"
										: "opacity-75"
								}
							>
								<CardHeader className="pb-2">
									<div className="flex items-start justify-between">
										<div>
											<CardTitle className="text-base">
												{work.jobTitle}
											</CardTitle>
											<CardDescription className="flex items-center gap-2 mt-1">
												<Building2 className="h-3 w-3" />
												{work.companyName}
											</CardDescription>
										</div>
										<Badge
											variant={work.reference ? "default" : "secondary"}
										>
											{work.employmentType}
										</Badge>
									</div>
								</CardHeader>
								<CardContent className="space-y-3">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Calendar className="h-3 w-3" />
										<span>
											{work.startDate} - {work.endDate || "Present"}
										</span>
									</div>

									{work.responsibilities && (
										<p className="text-sm text-muted-foreground">
											{work.responsibilities}
										</p>
									)}

									{work.reference ? (
										<div className="flex items-center justify-between pt-2 border-t">
											<div className="flex items-center gap-2">
												<Phone className="h-4 w-4 text-green-600" />
												<div className="text-sm">
													<span className="font-medium">
														{work.reference.name}
													</span>
													<span className="text-muted-foreground">
														{" "}
														- {work.reference.title}
													</span>
												</div>
											</div>
											<Button size="sm" asChild>
												<Link
													href={`/voice/demo/${candidateId}/${work.id}`}
												>
													<PhoneCall className="mr-2 h-4 w-4" />
													Verify
												</Link>
											</Button>
										</div>
									) : (
										<div className="flex items-center gap-2 pt-2 border-t text-sm text-muted-foreground">
											<Phone className="h-4 w-4" />
											<span>No reference contact available</span>
										</div>
									)}
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</main>
		</div>
	);
}
