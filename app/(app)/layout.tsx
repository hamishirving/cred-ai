import { cookies } from "next/headers";
import Script from "next/script";
import { AppSidebar } from "@/components/sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { OrgProvider } from "@/lib/org-context";
import { auth } from "@/lib/auth";

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [session, cookieStore] = await Promise.all([auth(), cookies()]);
	const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

	// Build user object with role info for sidebar
	const user = session?.user
		? {
				id: session.user.id,
				email: session.user.email,
				firstName: session.user.firstName,
				lastName: session.user.lastName,
				type: session.user.type,
				roleName: session.user.roleName,
				roleSlug: session.user.roleSlug,
			}
		: undefined;

	return (
		<>
			<Script
				src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
				strategy="beforeInteractive"
			/>
			<OrgProvider>
				<DataStreamProvider>
					<SidebarProvider defaultOpen={!isCollapsed}>
						<AppSidebar user={user} />
						<SidebarInset>{children}</SidebarInset>
					</SidebarProvider>
				</DataStreamProvider>
			</OrgProvider>
		</>
	);
}
