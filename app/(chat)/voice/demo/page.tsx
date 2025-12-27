import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/app/(auth)/auth";
import { getAllCandidates, countReferences } from "@/data/demo/candidates";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, ChevronLeft, User, Briefcase, ChevronRight } from "lucide-react";

export default async function VoiceDemoPage() {
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
					<h1 className="font-semibold">Demo Candidates</h1>
				</div>
			</header>

			<main className="flex-1 p-4 md:p-6">
				<div className="max-w-4xl mx-auto space-y-6">
					<div className="text-center mb-8">
						<h2 className="text-2xl font-bold mb-2">
							Employment Verification Demo
						</h2>
						<p className="text-muted-foreground">
							Select a candidate to verify their employment history with AI voice
							calls
						</p>
					</div>

					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{candidates.map((candidate) => {
							const refs = countReferences(candidate.id);
							return (
								<Card key={candidate.id} className="hover:border-primary/50 transition-colors">
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
													<User className="h-5 w-5 text-primary" />
												</div>
												<div>
													<CardTitle className="text-base">
														{candidate.name}
													</CardTitle>
													<CardDescription className="text-xs">
														{candidate.email}
													</CardDescription>
												</div>
											</div>
										</div>
									</CardHeader>
									<CardContent className="space-y-3">
										<div className="flex items-center gap-2 text-sm">
											<Briefcase className="h-4 w-4 text-muted-foreground" />
											<span className="text-muted-foreground">Applying for:</span>
										</div>
										<div className="pl-6">
											<p className="font-medium text-sm">
												{candidate.currentApplication.jobTitle}
											</p>
											<p className="text-xs text-muted-foreground">
												{candidate.currentApplication.companyName}
											</p>
										</div>
										<div className="flex items-center justify-between pt-2">
											<Badge variant="secondary">
												{refs.available}/{refs.total} references available
											</Badge>
											<Button size="sm" asChild>
												<Link href={`/voice/demo/${candidate.id}`}>
													View
													<ChevronRight className="ml-1 h-4 w-4" />
												</Link>
											</Button>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				</div>
			</main>
		</div>
	);
}
