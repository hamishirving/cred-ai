import Form from "next/form";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/lib/auth";
import { getPostHogClient } from "@/lib/posthog-server";

export const SignOutForm = () => {
	return (
		<Form
			action={async () => {
				"use server";

				// Get the current user before signing out to track the event
				const session = await auth();
				if (session?.user) {
					const posthog = getPostHogClient();
					posthog.capture({
						distinctId: session.user.id,
						event: "user_signed_out",
						properties: {
							email: session.user.email,
						},
					});
					await posthog.shutdown();
				}

				await signOut();
				redirect("/");
			}}
			className="w-full"
		>
			<button
				className="w-full px-1 py-0.5 text-left text-red-500"
				type="submit"
			>
				Sign out
			</button>
		</Form>
	);
};
