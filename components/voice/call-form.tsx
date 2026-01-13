"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Field,
	FieldLabel,
	FieldDescription,
	FieldError,
	FieldGroup,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, Loader2 } from "lucide-react";
import type { VoiceTemplate, FieldSchema } from "@/lib/voice/types";

interface CallFormProps {
	template: VoiceTemplate;
	defaultValues?: Record<string, unknown>;
	phoneNumber?: string;
	recipientName?: string;
	onSubmit: (data: {
		phoneNumber: string;
		recipientName?: string;
		context: Record<string, unknown>;
	}) => Promise<{ success: boolean; callId?: string; error?: string }>;
	onCallInitiated?: (callId: string) => void;
}

// Build Zod schema dynamically from template
function buildContextSchema(fields: FieldSchema[]) {
	const shape: Record<string, z.ZodTypeAny> = {};

	for (const field of fields) {
		let fieldSchema: z.ZodTypeAny;

		switch (field.type) {
			case "email":
				fieldSchema = z.string().email("Invalid email address");
				break;
			case "phone":
				fieldSchema = z
					.string()
					.regex(/^\+[1-9]\d{1,14}$/, "Must be in E.164 format");
				break;
			case "boolean":
				fieldSchema = z.boolean();
				break;
			case "date":
				fieldSchema = z.string();
				break;
			case "select":
				fieldSchema = z.string();
				break;
			default:
				fieldSchema = z.string();
		}

		if (!field.required) {
			fieldSchema = fieldSchema.optional().or(z.literal(""));
		} else if (field.type !== "boolean") {
			fieldSchema = z.string().min(1, `${field.label} is required`);
		}

		shape[field.key] = fieldSchema;
	}

	return z.object(shape);
}

export function CallForm({
	template,
	defaultValues = {},
	phoneNumber: initialPhoneNumber = "",
	recipientName: initialRecipientName = "",
	onSubmit,
	onCallInitiated,
}: CallFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Build default context from template schema and provided defaults
	const defaultContext: Record<string, unknown> = {};
	for (const field of template.contextSchema) {
		defaultContext[field.key] =
			defaultValues[field.key] ?? (field.type === "boolean" ? false : "");
	}

	// Create the full form schema
	const formSchema = z.object({
		phoneNumber: z
			.string()
			.min(1, "Phone number is required")
			.regex(
				/^\+[1-9]\d{1,14}$/,
				"Must be in E.164 format (e.g., +44xxxxxxxxxx)",
			),
		recipientName: z.string().optional(),
		context: buildContextSchema(template.contextSchema),
	});

	type FormData = z.infer<typeof formSchema>;

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			phoneNumber: initialPhoneNumber,
			recipientName: initialRecipientName,
			context: defaultContext as FormData["context"],
		},
	});

	const handleSubmit = async (data: FormData) => {
		setIsSubmitting(true);
		setError(null);

		try {
			const result = await onSubmit({
				phoneNumber: data.phoneNumber,
				recipientName: data.recipientName || undefined,
				context: data.context,
			});

			if (result.success && result.callId) {
				onCallInitiated?.(result.callId);
			} else {
				setError(result.error || "Failed to initiate call");
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "An unexpected error occurred",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const renderContextField = (fieldSchema: FieldSchema) => {
		const fieldName = `context.${fieldSchema.key}` as const;

		return (
			<Controller
				key={fieldSchema.key}
				name={fieldName}
				control={form.control}
				render={({ field, fieldState }) => (
					<Field data-invalid={fieldState.invalid}>
						<FieldLabel htmlFor={fieldSchema.key}>
							{fieldSchema.label}
							{fieldSchema.required && (
								<span className="text-destructive ml-1">*</span>
							)}
						</FieldLabel>

						{fieldSchema.type === "select" && fieldSchema.options ? (
							<Select
								value={field.value as string}
								onValueChange={field.onChange}
							>
								<SelectTrigger
									id={fieldSchema.key}
									aria-invalid={fieldState.invalid}
								>
									<SelectValue placeholder={`Select ${fieldSchema.label}`} />
								</SelectTrigger>
								<SelectContent>
									{fieldSchema.options.map((option) => (
										<SelectItem key={option} value={option}>
											{option}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : fieldSchema.type === "boolean" ? (
							<div className="flex items-center gap-2">
								<Checkbox
									id={fieldSchema.key}
									checked={field.value as boolean}
									onCheckedChange={field.onChange}
								/>
								{fieldSchema.description && (
									<span className="text-sm text-muted-foreground">
										{fieldSchema.description}
									</span>
								)}
							</div>
						) : fieldSchema.type === "date" ? (
							<Input
								type="month"
								id={fieldSchema.key}
								{...field}
								value={(field.value as string) || ""}
								aria-invalid={fieldState.invalid}
							/>
						) : fieldSchema.type === "phone" ? (
							<Input
								type="tel"
								id={fieldSchema.key}
								placeholder="+44..."
								{...field}
								value={(field.value as string) || ""}
								aria-invalid={fieldState.invalid}
							/>
						) : fieldSchema.type === "email" ? (
							<Input
								type="email"
								id={fieldSchema.key}
								placeholder="email@example.com"
								{...field}
								value={(field.value as string) || ""}
								aria-invalid={fieldState.invalid}
							/>
						) : (
							<Input
								type="text"
								id={fieldSchema.key}
								{...field}
								value={(field.value as string) || ""}
								aria-invalid={fieldState.invalid}
							/>
						)}

						{fieldSchema.description && fieldSchema.type !== "boolean" && (
							<FieldDescription>{fieldSchema.description}</FieldDescription>
						)}

						{fieldState.invalid && (
							<FieldError errors={[fieldState.error]} />
						)}
					</Field>
				)}
			/>
		);
	};

	return (
		<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
			<FieldGroup>
				{/* Phone number field (always required) */}
				<Controller
					name="phoneNumber"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="phoneNumber">
								Phone Number <span className="text-destructive">*</span>
							</FieldLabel>
							<div className="relative">
								<Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									type="tel"
									id="phoneNumber"
									placeholder="+44xxxxxxxxxx"
									className="pl-10"
									{...field}
									aria-invalid={fieldState.invalid}
								/>
							</div>
							<FieldDescription>
								Enter the phone number in international format
							</FieldDescription>
							{fieldState.invalid && (
								<FieldError errors={[fieldState.error]} />
							)}
						</Field>
					)}
				/>

				{/* Recipient name (optional) */}
				<Controller
					name="recipientName"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="recipientName">Recipient Name</FieldLabel>
							<Input
								id="recipientName"
								placeholder="John Smith"
								{...field}
								aria-invalid={fieldState.invalid}
							/>
							<FieldDescription>
								Name of the person being called (optional)
							</FieldDescription>
						</Field>
					)}
				/>
			</FieldGroup>

			{/* Dynamic context fields from template */}
			{template.contextSchema.length > 0 && (
				<div className="space-y-4">
					<h3 className="text-sm font-medium text-muted-foreground">
						Call Context
					</h3>
					<FieldGroup>{template.contextSchema.map(renderContextField)}</FieldGroup>
				</div>
			)}

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<Button type="submit" className="w-full" disabled={isSubmitting}>
				{isSubmitting ? (
					<>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Initiating Call...
					</>
				) : (
					<>
						<Phone className="mr-2 h-4 w-4" />
						{template.ui?.buttonLabel || "Initiate Call"}
					</>
				)}
			</Button>
		</form>
	);
}
