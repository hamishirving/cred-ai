"use client";

import { useActionState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import type { AuthResult } from "@/lib/auth/actions";

export function AuthForm({
	action,
	children,
	defaultEmail = "",
}: {
	action: (prevState: AuthResult, formData: FormData) => Promise<AuthResult>;
	children: React.ReactNode;
	defaultEmail?: string;
}) {
	const [state, formAction, isPending] = useActionState(action, {});

	return (
		<form action={formAction} className="flex flex-col gap-4 px-4 sm:px-16">
			{state.error && (
				<div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
					{state.error}
				</div>
			)}

			<div className="flex flex-col gap-2">
				<Label
					className="font-normal text-zinc-600 dark:text-zinc-400"
					htmlFor="email"
				>
					Email Address
				</Label>

				<Input
					autoComplete="email"
					autoFocus
					className="bg-muted text-md md:text-sm"
					defaultValue={defaultEmail}
					id="email"
					name="email"
					placeholder="user@credentially.io"
					required
					type="email"
					disabled={isPending}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label
					className="font-normal text-zinc-600 dark:text-zinc-400"
					htmlFor="password"
				>
					Password
				</Label>

				<Input
					className="bg-muted text-md md:text-sm"
					id="password"
					name="password"
					required
					type="password"
					disabled={isPending}
				/>
			</div>

			{children}
		</form>
	);
}
