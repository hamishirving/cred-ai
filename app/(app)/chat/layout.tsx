import { auth } from "@/lib/auth";
import { ChatSidebar } from "./chat-sidebar";

export default async function ChatLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await auth();

	return (
		<ChatSidebar user={session?.user}>
			{children}
		</ChatSidebar>
	);
}
