import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session cookie and fences the app behind sign-in.
 *
 * Next 16 renamed middleware to proxy: this file and its export must be
 * called `proxy`, or it silently never runs.
 *
 * Crisp is internal, so everything is gated except the sign-in flow itself.
 * Pages still check the user; this is the outer fence, not the only one.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // No Supabase project configured yet: let requests through so the shell
  // can be built and reviewed before the backend exists.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run logic between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // A session alone is not enough: the anon key is public, so anyone can
  // create a Supabase account and hold a session. Only a team_members row
  // gets past the fence (row-level security returns a row only for members).
  if (user && !isAuthRoute) {
    const { data: member } = await supabase.from("team_members").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!member) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/not-authorized";
      url.search = user.email ? `?email=${encodeURIComponent(user.email)}` : "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Exclude static assets. Without this the fence also blocks CSS and JS.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
