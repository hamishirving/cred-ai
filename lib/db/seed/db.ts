/**
 * Database connection for seed scripts.
 *
 * Separate from the main queries.ts which uses "server-only".
 * This allows seed scripts to run via tsx.
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../schema";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!databaseUrl) {
	throw new Error("DATABASE_URL or POSTGRES_URL is not defined");
}

const client = postgres(databaseUrl, { max: 1 });
export const db = drizzle(client, { schema });

export async function closeConnection() {
	await client.end();
}
