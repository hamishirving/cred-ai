/**
 * FA Client Factory
 *
 * Returns the LiveFAClient for Sterling API v2 integration.
 */

import type { FAClient } from "./types";
import { LiveFAClient } from "./live-client";

let client: FAClient | null = null;

export function getFAClient(): FAClient {
  if (client) return client;
  client = new LiveFAClient();
  return client;
}

// Re-export types for convenience
export type { FAClient } from "./types";
