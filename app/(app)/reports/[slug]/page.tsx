import { BarChart3, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const reportMeta: Record<string, { title: string; description: string }> = {
	pipeline: {
		title: "Pipeline Report",
		description: "Detailed breakdown of candidates at each onboarding stage.",
	},
	compliance: {
		title: "Compliance Report",
		description: "Organisation-wide compliance status and trends.",
	},
	cohorts: {
		title: "Cohort Analysis",
		description: "Time to compliance by candidate cohort.",
	},
};

export default async function ReportDetailPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const meta = reportMeta[slug];

	return (
		<div className="flex min-h-full flex-1 flex-col gap-8 bg-background p-8">
			{/* Back link + header */}
			<div>
				<Button
					variant="ghost"
					size="sm"
					asChild
					className="-mb-2 -ml-2 text-muted-foreground hover:text-foreground"
				>
					<Link href="/reports">
						<ChevronLeft className="h-4 w-4 mr-1" />
						Back to Reports
					</Link>
				</Button>
				<h1 className="text-balance text-4xl font-semibold tracking-tight text-foreground">
					{meta?.title ?? slug}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					{meta?.description ?? `Report: ${slug}`}
				</p>
			</div>

			{/* Placeholder content */}
			<Card className="shadow-none! bg-card">
				<CardContent className="flex flex-col items-center justify-center py-16">
					<BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/80" />
					<h3 className="text-xl font-semibold text-foreground">Coming soon</h3>
					<p className="mt-1 max-w-[40ch] text-center text-sm text-muted-foreground">
						Detailed report views are being built. Head back to the overview for current analytics.
					</p>
					<Button variant="outline" size="sm" asChild className="mt-4">
						<Link href="/reports">View Reports Overview</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
