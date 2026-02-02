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
		<div className="flex flex-1 flex-col gap-8 p-8 bg-[#faf9f7] min-h-full">
			{/* Back link + header */}
			<div>
				<Button
					variant="ghost"
					size="sm"
					asChild
					className="text-[#8a857d] hover:text-[#3d3a32] -ml-2 mb-2"
				>
					<Link href="/reports">
						<ChevronLeft className="h-4 w-4 mr-1" />
						Back to Reports
					</Link>
				</Button>
				<h1 className="text-4xl font-semibold tracking-tight text-balance text-[#1c1a15]">
					{meta?.title ?? slug}
				</h1>
				<p className="text-[#6b6760] text-sm mt-1">
					{meta?.description ?? `Report: ${slug}`}
				</p>
			</div>

			{/* Placeholder content */}
			<Card className="shadow-none! bg-white">
				<CardContent className="flex flex-col items-center justify-center py-16">
					<BarChart3 className="h-10 w-10 text-[#a8a49c] mb-3" />
					<h3 className="text-xl font-semibold text-[#1c1a15]">Coming soon</h3>
					<p className="text-sm text-[#8a857d] max-w-[40ch] mt-1 text-center">
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
