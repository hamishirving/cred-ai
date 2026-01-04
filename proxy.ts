import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
	let supabaseResponse = NextResponse.next({
		request,
	});

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					// biome-ignore lint/complexity/noForEach: Supabase pattern
					cookiesToSet.forEach(({ name, value, options }) =>
						request.cookies.set(name, value),
					);
					supabaseResponse = NextResponse.next({
						request,
					});
					// biome-ignore lint/complexity/noForEach: Supabase pattern
					cookiesToSet.forEach(({ name, value, options }) =>
						supabaseResponse.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	// Refresh session if expired
	const {
		data: { user },
	} = await supabase.auth.getUser();

	// Protected routes - redirect to login if not authenticated
	const isAuthPage =
		request.nextUrl.pathname.startsWith("/login") ||
		request.nextUrl.pathname.startsWith("/register");

	// Public API routes (accessible without auth)
	const isPublicApi =
		request.nextUrl.pathname.match(/^\/api\/organisations\/[^/]+\/user-roles$/);

	// PostHog analytics routes
	const isPostHogRoute = request.nextUrl.pathname.startsWith("/ingest");

	if (!user && !isAuthPage && !isPublicApi && !isPostHogRoute) {
		// Redirect to login page
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}

	// If user is authenticated and trying to access auth pages, redirect to home
	if (user && isAuthPage) {
		const url = request.nextUrl.clone();
		url.pathname = "/";
		return NextResponse.redirect(url);
	}

	return supabaseResponse;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public folder
		 * - api routes
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
