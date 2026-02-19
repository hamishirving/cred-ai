/**
 * FA Package Selector Tool
 *
 * Deterministic package selection. Returns which FA package to use
 * and explains why. Agents must call this and cite the result.
 */

import { tool } from "ai";
import { z } from "zod";
import { selectFAPackage } from "@/lib/api/first-advantage/package-selector";

export const faSelectPackage = tool({
  description: `Select the correct First Advantage screening package for a placement.
Returns the package ID, name, tier (1 or 2), and the reason for selection.

IMPORTANT: Always call this tool to determine the package. Do not reason about
package selection from your prompt alone -- this tool encodes the business rules.

Package #1 (Standard): SSN, County, Federal, Nationwide, NSOPW, FACIS.
Package #2 (Standard + OIG/SAM): #1 + Statewide Criminal, OIG, SAM.

Triggers for Package #2: lapse deals, certain states, facility requirements, government placements.`,

  inputSchema: z.object({
    targetState: z.string().describe("US state for the placement"),
    dealType: z.enum(["standard", "lapse", "quickstart", "reassignment", "government"]).default("standard"),
    lastAssignmentEndDate: z.string().optional().describe("ISO date of when candidate's last assignment ended"),
    facilityRequiresOigSam: z.boolean().default(false).describe("Whether the facility requires OIG/SAM checks"),
  }),

  execute: async (input) => {
    try {
      const result = selectFAPackage({
        targetState: input.targetState,
        dealType: input.dealType,
        lastAssignmentEndDate: input.lastAssignmentEndDate,
        facilityRequiresOigSam: input.facilityRequiresOigSam,
      });
      return { data: result };
    } catch (error) {
      return { error: `Package selection failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
});
