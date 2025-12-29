import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: ".env.local",
});

// Only used for drizzle-kit studio (data browsing)
// Migrations are handled by Supabase CLI (see lib/db/CLAUDE.md)
export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    // biome-ignore lint: Forbidden non-null assertion.
    url: process.env.DATABASE_URL!,
  },
});
