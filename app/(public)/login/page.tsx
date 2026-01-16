import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { signInWithEmail } from "@/lib/auth/actions";
import { auth } from "@/lib/auth";

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string }>;
}) {
	const session = await auth();

	// If user is already logged in, redirect to home
	if (session) {
		redirect("/");
	}

	const { error } = await searchParams;
	const verificationFailed = error === "verification_failed";

	return (
		<div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
			<div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
				<div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
					<h3 className="text-xl font-semibold dark:text-zinc-50">Sign In</h3>
					<p className="text-sm text-gray-500 dark:text-zinc-400">
						Use your email and password to sign in
					</p>
				</div>

				{verificationFailed && (
					<div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mx-4 sm:mx-16 text-center">
						Email verification failed. Please try again or request a new
						verification link.
					</div>
				)}

				<AuthForm action={signInWithEmail}>
					<SubmitButton>Sign in</SubmitButton>

					<p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
						{"Don't have an account? "}
						<Link
							className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
							href="/register"
						>
							Sign up
						</Link>
						{" for free."}
					</p>
				</AuthForm>
			</div>
		</div>
	);
}
