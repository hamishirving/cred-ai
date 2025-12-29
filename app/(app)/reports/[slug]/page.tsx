import { BarChart3 } from "lucide-react";

export default async function ReportDetailPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;

	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<BarChart3 className="h-12 w-12 text-muted-foreground" />
			<h1 className="text-2xl font-semibold">Report</h1>
			<p className="text-muted-foreground text-center max-w-md">
				Report: {slug}
			</p>
		</div>
	);
}
