import { Bell } from "lucide-react";

export default function NotificationsPage() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<Bell className="h-12 w-12 text-muted-foreground" />
			<h1 className="text-2xl font-semibold">Notifications</h1>
			<p className="text-muted-foreground text-center max-w-md">
				Activity feed, alerts, and escalations requiring attention.
			</p>
		</div>
	);
}
