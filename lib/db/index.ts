import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Shared database connection
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is not defined");
}

const client = postgres(databaseUrl, {
	// Connection pool settings
	max: 10, // Max connections in pool
	idle_timeout: 20, // Close idle connections after 20s
	connect_timeout: 10, // Timeout for new connections

	// Prepare statements for better performance
	prepare: true,
});

export const db = drizzle(client);
