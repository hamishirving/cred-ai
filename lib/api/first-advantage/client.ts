/**
 * FA Client Factory
 *
 * Returns LiveFAClient or MockFAClient based on FA_API_MODE env var.
 * Default: "mock" (switch to live only for controlled smoke tests).
 */

import type { FAClient } from "./types";
import { LiveFAClient } from "./live-client";
import { MockFAClient } from "./mock-client";

let client: FAClient | null = null;

export function getFAClient(): FAClient {
  if (client) return client;

  const mode = process.env.FA_API_MODE || "mock";

  if (mode === "mock") {
    console.log("[FA] Using mock client");
    client = new MockFAClient();
  } else {
    console.log("[FA] Using live client");
    client = new LiveFAClient();
  }

  return client;
}

// Re-export types for convenience
export type { FAClient } from "./types";
