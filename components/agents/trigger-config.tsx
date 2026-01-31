"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AgentTrigger } from "@/lib/db/schema/agents";

interface TriggerConfigProps {
	trigger: AgentTrigger;
	onChange: (trigger: AgentTrigger) => void;
}

export function TriggerConfig({ trigger, onChange }: TriggerConfigProps) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-col gap-1">
				<Label className="text-xs">Type</Label>
				<Select
					value={trigger.type}
					onValueChange={(v) =>
						onChange({ ...trigger, type: v as AgentTrigger["type"] })
					}
				>
					<SelectTrigger className="h-8 text-xs">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="manual" className="text-xs">Manual</SelectItem>
						<SelectItem value="schedule" className="text-xs">Schedule</SelectItem>
						<SelectItem value="event" className="text-xs">Event</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{trigger.type === "schedule" && (
				<>
					<div className="flex flex-col gap-1">
						<Label className="text-xs">Cron expression</Label>
						<Input
							className="h-8 text-xs font-mono"
							placeholder="0 9 * * MON"
							value={trigger.cron || ""}
							onChange={(e) =>
								onChange({ ...trigger, cron: e.target.value })
							}
						/>
						<p className="text-xs text-muted-foreground">e.g. "0 9 * * MON" = every Monday 9am</p>
					</div>
					<div className="flex flex-col gap-1">
						<Label className="text-xs">Timezone</Label>
						<Input
							className="h-8 text-xs"
							placeholder="Europe/London"
							value={trigger.timezone || ""}
							onChange={(e) =>
								onChange({ ...trigger, timezone: e.target.value })
							}
						/>
					</div>
				</>
			)}

			{trigger.type === "event" && (
				<div className="flex flex-col gap-1">
					<Label className="text-xs">Event name</Label>
					<Input
						className="h-8 text-xs font-mono"
						placeholder="document.uploaded"
						value={trigger.eventName || ""}
						onChange={(e) =>
							onChange({ ...trigger, eventName: e.target.value })
						}
					/>
				</div>
			)}

			<div className="flex flex-col gap-1">
				<Label className="text-xs">Description</Label>
				<Input
					className="h-8 text-xs"
					placeholder="When this agent should run"
					value={trigger.description || ""}
					onChange={(e) =>
						onChange({ ...trigger, description: e.target.value })
					}
				/>
			</div>
		</div>
	);
}
