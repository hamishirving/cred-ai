"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon, WarningIcon } from "./icons";

const iconsByType: Record<"success" | "error", ReactNode> = {
	success: <CheckCircleFillIcon />,
	error: <WarningIcon />,
};

export function toast(props: Omit<ToastProps, "id">) {
	return sonnerToast.custom((id) => (
		<Toast
			description={props.description}
			id={id}
			type={props.type}
			action={props.action}
		/>
	));
}

function Toast(props: ToastProps) {
	const { id, type, description, action } = props;

	const descriptionRef = useRef<HTMLDivElement>(null);
	const [multiLine, setMultiLine] = useState(false);

	useEffect(() => {
		const el = descriptionRef.current;
		if (!el) {
			return;
		}

		const update = () => {
			const lineHeight = Number.parseFloat(getComputedStyle(el).lineHeight);
			const lines = Math.round(el.scrollHeight / lineHeight);
			setMultiLine(lines > 1);
		};

		update(); // initial check
		const ro = new ResizeObserver(update); // re-check on width changes
		ro.observe(el);

		return () => ro.disconnect();
	}, []);

	return (
		<div className="flex toast-mobile:w-[356px] w-full justify-center">
			<div
				className={cn(
					"flex toast-mobile:w-fit w-full flex-row gap-3 rounded-lg bg-card p-3",
					multiLine ? "items-start" : "items-center",
				)}
				data-testid="toast"
				key={id}
			>
				<div
					className={cn(
						"data-[type=error]:text-destructive data-[type=success]:text-[var(--positive)]",
						{ "pt-1": multiLine },
					)}
					data-type={type}
				>
					{iconsByType[type]}
				</div>
				<div className="text-foreground text-sm" ref={descriptionRef}>
					{description}
				</div>
				{action && (
					<button
						type="button"
						onClick={() => {
							action.onClick();
							sonnerToast.dismiss(id);
						}}
						className="shrink-0 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer"
					>
						{action.label}
					</button>
				)}
			</div>
		</div>
	);
}

type ToastProps = {
	id: string | number;
	type: "success" | "error";
	description: string;
	action?: { label: string; onClick: () => void };
};
