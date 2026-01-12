"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/lib/data/mock-admins";

interface MentionPopoverProps {
	/** Whether the popover is open */
	isOpen: boolean;
	/** List of admin users to show */
	admins: AdminUser[];
	/** Filter query (text after @) */
	query: string;
	/** Called when user selects an admin */
	onSelect: (admin: AdminUser) => void;
	/** Called when popover should close */
	onClose: () => void;
}

export function MentionPopover({
	isOpen,
	admins,
	query,
	onSelect,
	onClose,
}: MentionPopoverProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const popoverRef = useRef<HTMLDivElement>(null);

	// Filter admins by query
	const filteredAdmins = admins.filter((admin) => {
		if (!query) return true;
		const lowerQuery = query.toLowerCase();
		return (
			admin.firstName.toLowerCase().startsWith(lowerQuery) ||
			admin.lastName.toLowerCase().startsWith(lowerQuery) ||
			`${admin.firstName} ${admin.lastName}`.toLowerCase().includes(lowerQuery)
		);
	});

	// Reset selection when filtered list changes
	useEffect(() => {
		setSelectedIndex(0);
	}, [filteredAdmins.length, query]);

	// Handle keyboard navigation
	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (!isOpen) return;

			switch (event.key) {
				case "ArrowDown":
					event.preventDefault();
					setSelectedIndex((prev) =>
						prev < filteredAdmins.length - 1 ? prev + 1 : 0,
					);
					break;
				case "ArrowUp":
					event.preventDefault();
					setSelectedIndex((prev) =>
						prev > 0 ? prev - 1 : filteredAdmins.length - 1,
					);
					break;
				case "Enter":
				case "Tab":
					event.preventDefault();
					if (filteredAdmins[selectedIndex]) {
						onSelect(filteredAdmins[selectedIndex]);
					}
					break;
				case "Escape":
					event.preventDefault();
					onClose();
					break;
			}
		},
		[isOpen, filteredAdmins, selectedIndex, onSelect, onClose],
	);

	// Attach keyboard listener
	useEffect(() => {
		if (isOpen) {
			document.addEventListener("keydown", handleKeyDown);
			return () => document.removeEventListener("keydown", handleKeyDown);
		}
	}, [isOpen, handleKeyDown]);

	// Close on click outside
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			if (
				popoverRef.current &&
				!popoverRef.current.contains(event.target as Node)
			) {
				onClose();
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isOpen, onClose]);

	if (!isOpen || filteredAdmins.length === 0) {
		return null;
	}

	return (
		<div
			ref={popoverRef}
			className="absolute bottom-full left-0 z-50 mb-2 min-w-[200px] max-w-[280px] rounded-lg border bg-popover p-1 shadow-md"
		>
			<div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
				Team members
			</div>
			<div className="max-h-[200px] overflow-y-auto">
				{filteredAdmins.map((admin, index) => (
					<button
						key={admin.id}
						type="button"
						className={cn(
							"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
							index === selectedIndex
								? "bg-accent text-accent-foreground"
								: "hover:bg-accent/50",
						)}
						onClick={() => onSelect(admin)}
						onMouseEnter={() => setSelectedIndex(index)}
					>
						<Avatar className="h-6 w-6">
							<AvatarFallback className="text-[10px] bg-primary/10 text-primary">
								{admin.initials}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 min-w-0">
							<div className="font-medium truncate">
								{admin.firstName === "me" ? "Me" : `${admin.firstName} ${admin.lastName}`}
							</div>
							<div className="text-xs text-muted-foreground truncate">
								{admin.firstName === "me" ? "Assign to yourself" : admin.role}
							</div>
						</div>
					</button>
				))}
			</div>
		</div>
	);
}
