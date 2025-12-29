import { Users } from "lucide-react";

export default function UsersSettingsPage() {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
			<Users className="h-12 w-12 text-muted-foreground" />
			<h1 className="text-2xl font-semibold">User Management</h1>
			<p className="text-muted-foreground text-center max-w-md">
				Invite users and assign roles.
			</p>
		</div>
	);
}
