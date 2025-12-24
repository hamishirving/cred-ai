import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

/**
 * File upload endpoint - temporarily disabled
 *
 * TODO: Implement Supabase Storage integration
 * See docs/vercel-migration-plan.md for implementation details
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { error: "File uploads are temporarily disabled" },
    { status: 501 } // 501 Not Implemented
  );
}
