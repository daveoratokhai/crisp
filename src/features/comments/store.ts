import "server-only";
import { createClient, hasSupabase } from "@/lib/supabase/server";
import type { Comment } from "./types";

type Row = {
  id: string;
  document_id: string;
  author_id: string | null;
  author_email: string | null;
  quote: string;
  prefix: string;
  suffix: string;
  body: string;
  created_at: string;
};

const SELECT = "id, document_id, author_id, author_email, quote, prefix, suffix, body, created_at";

function rowToComment(row: Row): Comment {
  return {
    id: row.id,
    documentId: row.document_id,
    authorId: row.author_id,
    authorEmail: row.author_email,
    quote: row.quote,
    prefix: row.prefix,
    suffix: row.suffix,
    body: row.body,
    createdAt: row.created_at,
  };
}

/**
 * Comments on a published document, oldest first. Row-level security limits
 * this to team members; anyone else (or a signed-out visitor) sees none.
 *
 * Never throws: a comment thread failing to load should not take the whole
 * document page down with it.
 */
export async function loadComments(documentId: string): Promise<Comment[]> {
  if (!hasSupabase()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("comments")
      .select(SELECT)
      .eq("document_id", documentId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("crisp: could not load comments:", error.message);
      return [];
    }
    return (data as unknown as Row[]).map(rowToComment);
  } catch (err) {
    console.error("crisp: could not load comments:", err);
    return [];
  }
}
