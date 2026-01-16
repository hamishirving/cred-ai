import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/register-form";
import { SubmitButton } from "@/components/submit-button";
import { signUpWithEmail } from "@/lib/auth/actions";
import { auth } from "@/lib/auth";
import { getAllOrganisations } from "@/lib/db/queries";
import { getAllowedDomains } from "@/lib/auth/domain-whitelist";

export default async function RegisterPage() {
	const session = await auth();

	// If user is already logged in, redirect to home
	if (session) {
		redirect("/");
	}

	// Fetch organisations for the dropdown
	const organisations = await getAllOrganisations();
	const allowedDomains = getAllowedDomains();

	return (
		<div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
			<div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
				<div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
					<h3 className="text-xl font-semibold dark:text-zinc-50">
						Create Account
					</h3>
					<p className="text-sm text-gray-500 dark:text-zinc-400">
						Join your organisation to get started
					</p>
				</div>

				<RegisterForm
					action={signUpWithEmail}
					organisations={organisations.map((org) => ({
						id: org.id,
						name: org.name,
						slug: org.slug,
						description: org.description,
					}))}
					allowedDomains={allowedDomains}
				>
					<SubmitButton>Sign up</SubmitButton>

					<p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
						{"Already have an account? "}
						<Link
							className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
							href="/login"
						>
							Sign in
						</Link>
						{" instead."}
					</p>
				</RegisterForm>
			</div>
		</div>
	);
}
