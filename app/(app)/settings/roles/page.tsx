import { Shield } from "lucide-react";

export default function RolesSettingsPage() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<Shield className="h-12 w-12 text-muted-foreground" />
			<h1 className="text-2xl font-semibold">Role Management</h1>
			<p className="text-muted-foreground text-center max-w-md">
				Define roles and permissions.
			</p>
		</div>
	);
}
