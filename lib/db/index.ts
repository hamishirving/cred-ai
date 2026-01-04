import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Shared database connection
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}

const client = postgres(databaseUrl);
export const db = drizzle(client);
