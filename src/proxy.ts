import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CONSENT_PATH, RETURN_COOKIE } from "@/features/auth/return-to";

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
  const path = request.nextUrl.pathname;

  // The hosted MCP endpoint and its OAuth metadata are called by connectors
  // with no browser cookie. They check the bearer token and team membership
  // themselves (features/mcp/remote.ts); redirecting them to /login would break them.
  if (path === "/mcp" || path.startsWith("/.well-known/")) return NextResponse.next();

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

  const isAuthRoute = path.startsWith("/login") || path.startsWith("/auth");

  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // An agent's connection request must survive the Google round trip, so
    // the callback can send the person back to approve it. A cookie, not a
    // query param: Supabase only redirects to exact allowlisted URLs.
    if (path === CONSENT_PATH) {
      redirect.cookies.set(RETURN_COOKIE, `${path}${request.nextUrl.search}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
        maxAge: 600,
        path: "/",
      });
    }
    return redirect;
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
