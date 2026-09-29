import "server-only";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import type { Doc } from "./doc";
import { rowToDoc, TEAM_SELECT as SELECT, type TeamRow } from "./team";

/**
 * Published documents from the shared database, as the signed-in user.
 * Row-level security decides what comes back: a team member sees everything
 * published, anyone else sees nothing.
 *
 * Never throws. If the database is not configured, not reachable, or refuses
 * the query, the app carries on with local documents only; losing the team
 * view should never take the editor down with it.
 */
export async function loadTeamDocs(): Promise<Doc[]> {
  if (!hasSupabase()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("documents").select(SELECT);
    if (error) {
      console.error("crisp: could not load team documents:", error.message);
      return [];
    }
    return (data as unknown as TeamRow[]).map(rowToDoc);
  } catch (err) {
    console.error("crisp: could not load team documents:", err);
    return [];
  }
}

/** One published document, for making a local copy of it. Null if not found or not visible. */
export async function fetchTeamDoc(id: string): Promise<Doc | null> {
  if (!hasSupabase()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(`Could not load the team's copy: ${error.message}`);
  return data ? rowToDoc(data as unknown as TeamRow) : null;
}
