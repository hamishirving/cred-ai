import { tool } from "ai";
import { z } from "zod";
import {
  createProfile,
  updateProfileFields,
  isApiError,
} from "@/lib/api/credentially-client";
import type {
  CreateProfileResponseDto,
  CustomFieldInputDto,
} from "@/lib/api/types";

const customFieldSchema = z.object({
  fieldName: z.string().describe("Name of the custom field"),
  value: z.any().describe("Value for the custom field"),
});

export const manageProfile = tool({
  description: `Create a new employee profile or update custom fields for an existing profile.
Use this tool when the user wants to:
- Create a new employee profile
- Add or update custom field values for an employee
- Populate profile data programmatically

For creating profiles, email is required. For updating, email identifies which profile to update.`,

  inputSchema: z.object({
    action: z
      .enum(["create", "update"])
      .describe("Whether to create a new profile or update an existing one"),
    email: z.string().email().describe("Email address of the profile"),
    firstName: z.string().optional().describe("First name (for create)"),
    lastName: z.string().optional().describe("Last name (for create)"),
    roleName: z.string().optional().describe("Role name (for create)"),
    birthDate: z
      .string()
      .optional()
      .describe("Birth date in YYYY-MM-DD format (for create)"),
    registrationNumber: z
      .string()
      .optional()
      .describe("Registration number (for create)"),
    phone: z.string().optional().describe("Phone number (for create)"),
    skipOnboarding: z
      .boolean()
      .optional()
      .describe("Skip onboarding process (for create)"),
    sendInviteEmail: z
      .boolean()
      .optional()
      .describe("Send invitation email (for create)"),
    customFields: z
      .array(customFieldSchema)
      .optional()
      .describe("Custom fields to populate"),
  }),

  execute: async ({
    action,
    email,
    firstName,
    lastName,
    roleName,
    birthDate,
    registrationNumber,
    phone,
    skipOnboarding,
    sendInviteEmail,
    customFields,
  }): Promise<{ data: CreateProfileResponseDto } | { error: string }> => {
    console.log("[manageProfile] Action:", action, "Email:", email);

    if (action === "create") {
      const result = await createProfile({
        email,
        firstName,
        lastName,
        roleName,
        birthDate,
        registrationNumber,
        phone,
        skipOnboarding,
        sendInviteEmail,
        fields: customFields?.filter(
          (field) => field.value !== undefined
        ) as CustomFieldInputDto[] | undefined,
      });

      if (isApiError(result)) {
        return { error: result.error };
      }

      return { data: result };
    } else {
      // Update
      if (!customFields || customFields.length === 0) {
        return {
          error: "Custom fields are required for update action",
        };
      }

      const result = await updateProfileFields({
        email,
        fields: customFields.filter(
          (field) => field.value !== undefined
        ) as CustomFieldInputDto[],
      });

      if (isApiError(result)) {
        return { error: result.error };
      }

      return { data: result };
    }
  },
});
