"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@/lib/types/auth";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session: supabaseSession } }) => {
        if (supabaseSession?.user) {
          const isAnonymous = supabaseSession.user.is_anonymous || false;
          setSession({
            user: {
              id: supabaseSession.user.id,
              email:
                supabaseSession.user.email ||
                `anonymous-${supabaseSession.user.id}`,
              type: isAnonymous ? "guest" : "regular",
            },
          });
        }
        setIsLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      if (supabaseSession?.user) {
        const isAnonymous = supabaseSession.user.is_anonymous || false;
        setSession({
          user: {
            id: supabaseSession.user.id,
            email:
              supabaseSession.user.email ||
              `anonymous-${supabaseSession.user.id}`,
            type: isAnonymous ? "guest" : "regular",
          },
        });
      } else {
        setSession(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { session, isLoading };
}
