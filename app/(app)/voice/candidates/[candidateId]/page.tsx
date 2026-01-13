import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
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
		<div className="flex flex-1 flex-col gap-4 p-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-semibold">{candidate.name}</h1>
				<p className="text-muted-foreground text-sm">{candidate.email}</p>
			</div>

			{/* Candidate Info */}
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-4">
						<div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
							<User className="h-6 w-6 text-primary" />
						</div>
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
					</div>
				</CardContent>
			</Card>

			{/* Work History */}
			<div>
				<h2 className="text-lg font-medium mb-1">Employment History</h2>
				<p className="text-sm text-muted-foreground mb-4">
					Click on a role with a reference contact to initiate a verification call
				</p>

				<div className="space-y-3">
					{candidate.workHistory.map((work) => (
						<Card
							key={work.id}
							className={
								work.reference
									? "hover:border-primary/50 transition-colors"
									: "opacity-75"
							}
						>
							<CardHeader className="p-4 pb-2">
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
							<CardContent className="p-4 pt-0 space-y-3">
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
												href={`/voice/candidates/${candidateId}/${work.id}`}
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
		</div>
	);
}
