import "server-only";
import { isReadOnlyHost } from "@/lib/deploy";
import { createClient, hasSupabase } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {
  constructor() {
    super("Sign in with an account on the Crisp team.");
  }
}

export class ReadOnlyHostError extends Error {
  constructor() {
    super("This deployment has no writable disk. Run Crisp on your own machine to edit.");
  }
}

/**
 * The first check every write action runs, before requireMember(): cheap
 * (no network call) and true on any Vercel-style host, where a file written
 * now is gone before the next request. See src/lib/deploy.ts.
 */
export function assertWritable(): void {
  if (isReadOnlyHost()) throw new ReadOnlyHostError();
}

/**
 * The check every write action runs first. Server actions are reachable by a
 * direct POST to any page, including /login, which the proxy's sign-in fence
 * lets through, so a page-level check never covers them (Next's own guidance).
 *
 * With Supabase configured: a signed-in user with a team_members row, or
 * UnauthorizedError. Without it (local-only mode, no sign-in exists), writes
 * are allowed; the server listens on 127.0.0.1 only, so that is this machine.
 */
export async function requireMember(): Promise<{ userId: string | null }> {
  if (!hasSupabase()) return { userId: null };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();
  const { data: member, error } = await supabase.from("team_members").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error || !member) throw new UnauthorizedError();
  return { userId: user.id };
}
