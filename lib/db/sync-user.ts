import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { user } from "./schema";

// Sync a Supabase auth user to our User table
export async function syncUserToDatabase(userId: string, email: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Insert or update user in our User table
    await db
      .insert(user)
      .values({
        id: userId,
        email,
      })
      .onConflictDoNothing();
  } catch (error) {
    console.error("Failed to sync user to database:", error);
  } finally {
    await client.end();
  }
}
