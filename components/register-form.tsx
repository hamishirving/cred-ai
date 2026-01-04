"use client";

import { useActionState, useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import type { AuthResult } from "@/lib/auth/actions";

interface Organisation {
	id: string;
	name: string;
	slug: string;
	description: string | null;
}

interface UserRole {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	isDefault: boolean;
}

export function RegisterForm({
	action,
	children,
	organisations,
}: {
	action: (prevState: AuthResult, formData: FormData) => Promise<AuthResult>;
	children: React.ReactNode;
	organisations: Organisation[];
}) {
	const [state, formAction, isPending] = useActionState(action, {});
	const [selectedOrgId, setSelectedOrgId] = useState<string>("");
	const [roles, setRoles] = useState<UserRole[]>([]);
	const [selectedRoleId, setSelectedRoleId] = useState<string>("");
	const [isLoadingRoles, setIsLoadingRoles] = useState(false);

	// Fetch roles when organisation changes
	useEffect(() => {
		if (!selectedOrgId) {
			setRoles([]);
			setSelectedRoleId("");
			return;
		}

		async function fetchRoles() {
			setIsLoadingRoles(true);
			try {
				const response = await fetch(
					`/api/organisations/${selectedOrgId}/user-roles`
				);
				const data = await response.json();
				setRoles(data.roles || []);

				// Auto-select default role if there is one
				const defaultRole = data.roles?.find(
					(r: UserRole) => r.isDefault
				);
				if (defaultRole) {
					setSelectedRoleId(defaultRole.id);
				} else if (data.roles?.length === 1) {
					setSelectedRoleId(data.roles[0].id);
				} else {
					setSelectedRoleId("");
				}
			} catch (error) {
				console.error("Failed to fetch roles:", error);
				setRoles([]);
			} finally {
				setIsLoadingRoles(false);
			}
		}

		fetchRoles();
	}, [selectedOrgId]);

	return (
		<form action={formAction} className="flex flex-col gap-4 px-4 sm:px-16">
			{state.error && (
				<div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
					{state.error}
				</div>
			)}

			<div className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-2">
					<Label
						className="font-normal text-zinc-600 dark:text-zinc-400"
						htmlFor="firstName"
					>
						First Name
					</Label>
					<Input
						autoComplete="given-name"
						autoFocus
						className="bg-muted text-md md:text-sm"
						id="firstName"
						name="firstName"
						placeholder="John"
						required
						type="text"
						disabled={isPending}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label
						className="font-normal text-zinc-600 dark:text-zinc-400"
						htmlFor="lastName"
					>
						Last Name
					</Label>
					<Input
						autoComplete="family-name"
						className="bg-muted text-md md:text-sm"
						id="lastName"
						name="lastName"
						placeholder="Doe"
						required
						type="text"
						disabled={isPending}
					/>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label
					className="font-normal text-zinc-600 dark:text-zinc-400"
					htmlFor="email"
				>
					Email Address
				</Label>
				<Input
					autoComplete="email"
					className="bg-muted text-md md:text-sm"
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
					minLength={6}
					disabled={isPending}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label
					className="font-normal text-zinc-600 dark:text-zinc-400"
					htmlFor="organisationId"
				>
					Organisation
				</Label>
				<Select
					value={selectedOrgId}
					onValueChange={setSelectedOrgId}
					name="organisationId"
					required
					disabled={isPending}
				>
					<SelectTrigger className="bg-muted">
						<SelectValue placeholder="Select an organisation" />
					</SelectTrigger>
					<SelectContent>
						{organisations.map((org) => (
							<SelectItem key={org.id} value={org.id}>
								{org.name}
								{org.description && (
									<span className="text-zinc-500 ml-2">
										- {org.description}
									</span>
								)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{/* Hidden input to ensure value is submitted */}
				<input type="hidden" name="organisationId" value={selectedOrgId} />
			</div>

			<div className="flex flex-col gap-2">
				<Label
					className="font-normal text-zinc-600 dark:text-zinc-400"
					htmlFor="userRoleId"
				>
					Role
				</Label>
				<Select
					value={selectedRoleId}
					onValueChange={setSelectedRoleId}
					name="userRoleId"
					disabled={!selectedOrgId || isLoadingRoles || isPending}
					required
				>
					<SelectTrigger className="bg-muted">
						<SelectValue
							placeholder={
								isLoadingRoles
									? "Loading roles..."
									: !selectedOrgId
										? "Select an organisation first"
										: "Select a role"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{roles.map((role) => (
							<SelectItem key={role.id} value={role.id}>
								{role.name}
								{role.description && (
									<span className="text-zinc-500 ml-2">
										- {role.description}
									</span>
								)}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{/* Hidden input to ensure value is submitted */}
				<input type="hidden" name="userRoleId" value={selectedRoleId} />
			</div>

			{children}
		</form>
	);
}
