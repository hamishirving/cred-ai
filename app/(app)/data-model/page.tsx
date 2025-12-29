import { ErdCanvas } from "@/components/erd/erd-canvas";
import { erdConfig } from "@/components/erd/erd-config";

export const metadata = {
	title: "Data Model | Credentially",
	description: "Interactive ERD visualization of the Credentially 2.0 data model",
};

function DomainLegend() {
	return (
		<div className="absolute top-4 right-4 z-10 bg-card/95 backdrop-blur border border-border rounded-lg p-4 shadow-lg">
			<h3 className="font-semibold text-sm mb-3">Domains</h3>
			<div className="space-y-2">
				{Object.entries(erdConfig.domains).map(([key, config]) => (
					<div key={key} className="flex items-center gap-2 text-xs">
						<div
							className="w-3 h-3 rounded-sm"
							style={{ backgroundColor: config.color }}
						/>
						<span>{config.label}</span>
						<span className="text-muted-foreground">
							({config.tables.length})
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

export default function DataModelPage() {
	return (
		<div className="h-screen w-screen bg-background">
			{/* Header */}
			<div className="absolute top-4 left-4 z-10 bg-card/95 backdrop-blur border border-border rounded-lg px-4 py-3 shadow-lg">
				<h1 className="text-lg font-bold">Credentially 2.0 Data Model</h1>
				<p className="text-xs text-muted-foreground">
					Interactive ERD • Pan and zoom to explore
				</p>
			</div>

			{/* Legend */}
			<DomainLegend />

			{/* ERD Canvas */}
			<ErdCanvas />
		</div>
	);
}
