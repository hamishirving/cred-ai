"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CallRequest, CallResponse } from "@/types/call";

const formSchema = z.object({
  candidateName: z.string().min(1, "Candidate name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  companyName: z.string().min(1, "Company name is required"),
  timeEstimate: z.string().optional(),
  callbackNumber: z.string().optional(),
  employerPhoneNumber: z
    .string()
    .min(1, "Employer phone number is required")
    .regex(
      /^\+[1-9]\d{1,14}$/,
      "Phone number must be in E.164 format (e.g., +44xxxxxxxxxx)"
    ),
});

type FormData = z.infer<typeof formSchema>;

interface CallFormProps {
  candidateName?: string;
  jobTitle?: string;
  companyName?: string;
  timeEstimate?: string;
  callbackNumber?: string;
  employerPhoneNumber?: string;
}

export function CallForm({
  candidateName = "",
  jobTitle = "",
  companyName = "",
  timeEstimate = "5 minutes",
  callbackNumber = "",
  employerPhoneNumber = "",
}: CallFormProps = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      candidateName,
      jobTitle,
      companyName,
      timeEstimate,
      callbackNumber,
      employerPhoneNumber,
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/initiate-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data satisfies CallRequest),
      });

      const result: CallResponse = await response.json();

      if (result.success) {
        setMessage({
          type: "success",
          text: `Call initiated successfully! Call ID: ${result.callId}`,
        });
        form.reset();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to initiate call",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Employment Verification Call</CardTitle>
        <CardDescription>
          Initiate an AI-powered call to verify candidate work history with
          their previous employer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="candidateName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Candidate Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Alice Taylor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Senior Developer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Royal London Hospital NHS Trust"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timeEstimate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Call Duration</FormLabel>
                    <FormControl>
                      <Input placeholder="5 minutes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="callbackNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Callback Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+44xxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="employerPhoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employer Phone Number *</FormLabel>
                  <FormControl>
                    <Input placeholder="+44xxxxxxxxxx" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Initiating Call..." : "Initiate Call"}
            </Button>

            {message && (
              <div
                className={`p-4 rounded-md ${
                  message.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {message.text}
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
