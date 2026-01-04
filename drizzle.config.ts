import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: ".env.local",
});

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    // biome-ignore lint: Forbidden non-null assertion.
    url: process.env.DATABASE_URL!,
  },
});
