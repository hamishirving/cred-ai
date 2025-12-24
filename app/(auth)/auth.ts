import { syncUserToDatabase } from "@/lib/db/sync-user";
import { createClient } from "@/lib/supabase/server";

export type UserType = "guest" | "regular";

export async function auth() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  // Check if user is anonymous using the is_anonymous claim
  const isAnonymous = user.is_anonymous || false;
  const email = user.email || `anonymous-${user.id}`;

  // Sync user to our database
  await syncUserToDatabase(user.id, email);

  return {
    user: {
      id: user.id,
      type: (isAnonymous ? "guest" : "regular") as UserType,
      email,
    },
  };
}

// Sign in anonymously - for use in server actions
export async function signInAnonymously() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

// Mock handlers for compatibility
export const handlers = {
  GET: async () => new Response("Use Supabase auth", { status: 501 }),
  POST: async () => new Response("Use Supabase auth", { status: 501 }),
};

export const signIn = signInAnonymously;
