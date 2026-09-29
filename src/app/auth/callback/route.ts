import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands the Google OAuth redirect. Exchanges the code for a session, then
 * checks team membership.
 *
 * The `hd` param on the sign-in button only narrows Google's account picker;
 * it is not enforced. This is the real boundary: anyone with a Google
 * account can complete OAuth, but only a row in team_members gets them past
 * this check. Not a member: sign them straight back out, so no session for a
 * non-member ever reaches the rest of the app.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=oauth", origin));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=oauth", origin));

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?error=oauth", origin));

  const { data: membership } = await supabase.from("team_members").select("user_id").eq("user_id", user.id).maybeSingle();

  if (!membership) {
    await supabase.auth.signOut();
    const url = new URL("/auth/not-authorized", origin);
    if (user.email) url.searchParams.set("email", user.email);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL("/", origin));
}
