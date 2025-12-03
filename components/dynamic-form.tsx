"use client";

import { CheckIcon, CopyIcon, SendIcon } from "lucide-react";
import { useState } from "react";
import type { FormField, FormSchema } from "@/lib/ai/tools/create-form";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

function StarRating({
  value,
  onChange,
  max = 5,
}: {
  value: number;
  onChange: (val: number) => void;
  max?: number;
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          className={cn(
            "text-2xl transition-colors",
            star <= value
              ? "text-yellow-400"
              : "text-gray-300 hover:text-yellow-200"
          )}
          key={star}
          onClick={() => onChange(star)}
          type="button"
        >
          ★
        </button>
      ))}
    </div>
  );
}

function FormFieldComponent({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  switch (field.type) {
    case "text":
    case "email":
      return (
        <Input
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          type={field.type}
          value={(value as string) || ""}
        />
      );

    case "number":
      return (
        <Input
          max={field.max}
          min={field.min}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={field.placeholder}
          required={field.required}
          type="number"
          value={(value as number) || ""}
        />
      );

    case "textarea":
      return (
        <Textarea
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={4}
          value={(value as string) || ""}
        />
      );

    case "date":
      return (
        <Input
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          type="date"
          value={(value as string) || ""}
        />
      );

    case "select":
      return (
        <Select onValueChange={onChange} value={value as string}>
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || "Select..."} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "radio":
      return (
        <RadioGroup onValueChange={onChange} value={value as string}>
          {field.options?.map((opt) => (
            <div className="flex items-center space-x-2" key={opt.value}>
              <RadioGroupItem
                id={`${field.id}-${opt.value}`}
                value={opt.value}
              />
              <Label htmlFor={`${field.id}-${opt.value}`}>{opt.label}</Label>
            </div>
          ))}
        </RadioGroup>
      );

    case "checkbox":
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={value as boolean}
            id={field.id}
            onCheckedChange={onChange}
          />
          <Label className="font-normal text-sm" htmlFor={field.id}>
            {field.placeholder || "Yes"}
          </Label>
        </div>
      );

    case "rating":
      return (
        <StarRating
          max={field.max || 5}
          onChange={onChange}
          value={(value as number) || 0}
        />
      );

    default:
      return null;
  }
}

type DynamicFormProps = {
  schema: FormSchema;
  onSubmit?: (data: Record<string, unknown>) => void;
};

export function DynamicForm({ schema, onSubmit }: DynamicFormProps) {
  // Initialize form data with default values from schema
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    const defaults: Record<string, unknown> = {};
    for (const field of schema.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.id] = field.defaultValue;
      }
    }
    return defaults;
  });
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    onSubmit?.(formData);
  };

  const updateField = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCopyLink = async () => {
    // Simulate copying a shareable link
    const formLink = `https://forms.example.com/${schema.title.toLowerCase().replace(/\s+/g, "-")}`;
    await navigator.clipboard.writeText(formLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    setSending(true);
    // Simulate sending - replace with actual integration
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSending(false);
    setSent(true);
    console.log("Form sent, Schema:", schema);
  };

  if (sent) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <CheckIcon className="size-6" />
          </div>
          <h3 className="font-semibold text-lg">Form Sent!</h3>
          <p className="text-muted-foreground text-sm">
            The questionnaire has been sent successfully.
          </p>
          <Button onClick={() => setSent(false)} size="sm" variant="outline">
            Done
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <CheckIcon className="size-6" />
          </div>
          <h3 className="font-semibold text-lg">Form Submitted!</h3>
          <p className="text-muted-foreground text-sm">
            Your response has been recorded.
          </p>
          <Button
            onClick={() => {
              setSubmitted(false);
              setFormData({});
            }}
            size="sm"
            variant="outline"
          >
            Submit Another Response
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Form Content */}
      <div className="p-6">
        <div className="mb-6">
          <h3 className="font-semibold text-lg">{schema.title}</h3>
          {schema.description && (
            <p className="mt-1 text-muted-foreground text-sm">
              {schema.description}
            </p>
          )}
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {schema.fields.map((field) => (
            <div className="space-y-2" key={field.id}>
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="ml-1 text-red-500">*</span>}
              </Label>
              <FormFieldComponent
                field={field}
                onChange={(val) => updateField(field.id, val)}
                value={formData[field.id]}
              />
            </div>
          ))}
        </form>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3">
        <Button
          className="gap-2"
          onClick={handleCopyLink}
          size="sm"
          variant="outline"
        >
          {copied ? (
            <>
              <CheckIcon className="size-4" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="size-4" />
              Copy Link
            </>
          )}
        </Button>

        <Button
          className="gap-2"
          disabled={sending}
          onClick={handleSend}
          size="sm"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {sending ? (
            <>
              <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Sending...
            </>
          ) : (
            <>
              <SendIcon className="size-4" />
              Send Form
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

