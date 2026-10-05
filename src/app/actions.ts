"use server";

import { refresh } from "next/cache";
import { joinMarkdown } from "@/features/blocks/split";
import { createDoc, importDoc, markPublished, readById, replaceWithTeam, saveBody, saveTitle } from "@/features/workspace/store";
import { fetchTeamDoc } from "@/features/workspace/team-fetch";
import { titleCase } from "@/features/workspace/tree";
import { assertWritable, requireMember, UnauthorizedError, ReadOnlyHostError } from "@/features/auth/guard";
import { createClient, hasSupabase } from "@/lib/supabase/server";

/*
 * Server actions: the only way the browser writes to the workspace. Each one
 * is a public endpoint, so each first runs requireMember() (signed in and on
 * the team), then checks its inputs before they reach the store.
 * refresh() re-renders the current page, so the sidebar, top bar and table
 * pick up new titles and publish states straight away.
 */

const MAX_BODY = 1_000_000; // characters; far beyond any real document
const MAX_TITLE = 300;

/**
 * A teammate's published document has no file on this machine. The first
 * edit makes a local copy with the same id (as published), then applies the
 * edit to it, so it reads "Unpublished changes" and Share republishes it.
 */
async function ensureLocalCopy(id: string) {
  if (await readById(id)) return;
  const team = await fetchTeamDoc(id);
  if (!team) throw new Error("Document not found");
  await importDoc({
    id: team.id,
    title: team.title,
    docType: team.docType,
    client: team.client,
    process: team.process,
    stageOrder: team.stageOrder,
    publishedAt: team.publishedAt ?? new Date().toISOString(),
    blocks: team.blocks.map((b) => (b.type === "markdown" ? b.content.text : "")),
  });
}

export async function saveDocBody(id: string, blocks: string[]) {
  if (typeof id !== "string" || !Array.isArray(blocks) || !blocks.every((b) => typeof b === "string")) {
    throw new Error("Invalid document");
  }
  if (blocks.length > 10_000 || blocks.reduce((n, b) => n + b.length, 0) > MAX_BODY) throw new Error("Document is too large");
  assertWritable();
  await requireMember();
  await ensureLocalCopy(id);
  await saveBody(id, blocks);
  refresh();
}

export async function renameDoc(id: string, title: string) {
  if (typeof id !== "string" || typeof title !== "string" || title.length > MAX_TITLE) {
    throw new Error("Invalid title");
  }
  assertWritable();
  await requireMember();
  await ensureLocalCopy(id);
  await saveTitle(id, title);
  refresh();
}

/** Create a new local page and return its id so the caller can open it. */
export async function createPage(): Promise<string> {
  assertWritable();
  await requireMember();
  const doc = await createDoc({ title: "Untitled" });
  // Layouts survive navigation, so without this the sidebar would not show
  // the new page until something else refreshed it.
  refresh();
  return doc.id;
}

export type PublishResult =
  | { ok: true }
  /** A teammate published a newer version than the one this copy is based on. */
  | { ok: false; conflict: true; teamPublishedAt: string }
  | { ok: false; conflict?: false; message: string };

/**
 * Publish a local document to the team: the one-way gate from a file on this
 * machine to the shared database.
 *
 * Returns a result instead of throwing for expected failures: Next hides
 * thrown messages from the browser in production, so a thrown "a teammate
 * published first" would reach the Share button as a generic error.
 *
 * Never overwrites a teammate silently. If the team's version is newer than
 * the one this copy is based on, it refuses unless `overwrite` is set (the
 * Share button asks first). The check is part of the write itself: the update
 * only matches the row if its `published_at` is still what was just read, so
 * two people publishing at nearly the same moment cannot clobber each other.
 *
 * Row-level security is the real permission check: a session outside
 * team_members has every write refused by the database.
 *
 * The local file is only marked published after every database write
 * succeeds, so a failure part-way never leaves a file claiming to be shared.
 */
export async function publishDoc(id: string, { overwrite = false }: { overwrite?: boolean } = {}): Promise<PublishResult> {
  if (typeof id !== "string" || !id) return { ok: false, message: "Invalid document" };
  if (!hasSupabase()) return { ok: false, message: "The team database is not connected yet." };
  try {
    assertWritable();
    await requireMember();
  } catch (e) {
    if (e instanceof ReadOnlyHostError || e instanceof UnauthorizedError) return { ok: false, message: e.message };
    throw e;
  }

  const doc = await readById(id);
  if (!doc) return { ok: false, message: "Document not found" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to share a document." };

  // What the team has right now, if anything.
  const { data: existing, error: readError } = await supabase.from("documents").select("published_at").eq("id", doc.id).maybeSingle();
  if (readError) return { ok: false, message: `Could not check the team's copy: ${readError.message}` };

  const teamPublishedAt = existing ? new Date(existing.published_at).toISOString() : null;
  const behind = teamPublishedAt && (!doc.publishedAt || Date.parse(teamPublishedAt) > Date.parse(doc.publishedAt));
  if (behind && !overwrite) {
    refresh(); // so the page shows the newer-version notice
    return { ok: false, conflict: true, teamPublishedAt };
  }

  // A client appears in the database the first time one of its documents is
  // shared. Upsert on slug, so publishing twice never creates a duplicate.
  let clientId: string | null = null;
  if (doc.client) {
    const { data, error } = await supabase
      .from("clients")
      .upsert({ slug: doc.client, name: titleCase(doc.client) }, { onConflict: "slug" })
      .select("id")
      .single();
    if (error) return { ok: false, message: `Could not record the client: ${error.message}` };
    clientId = data.id;
  }

  // Process stages are seeded, never created here. An unknown slug is left
  // unlinked rather than failing the whole publish.
  let processId: string | null = null;
  if (doc.process) {
    const { data } = await supabase.from("processes").select("id").eq("slug", doc.process).maybeSingle();
    processId = data?.id ?? null;
  }

  const texts = doc.blocks.map((b) => (b.type === "markdown" ? b.content.text : ""));
  const publishedAt = new Date().toISOString();
  const row = {
    title: doc.title,
    doc_type: doc.docType,
    client_id: clientId,
    process_id: processId,
    body_markdown: joinMarkdown(texts),
    local_path: doc.localPath,
    published_at: publishedAt,
    published_by: user.id,
  };

  if (existing) {
    // Conditional on the version just read: zero rows matched means someone
    // published in between, so nothing is overwritten.
    const { data: updated, error } = await supabase
      .from("documents")
      .update(row)
      .eq("id", doc.id)
      .eq("published_at", existing.published_at)
      .select("id");
    if (error) return { ok: false, message: `Could not share this page: ${error.message}` };
    if (!updated || updated.length === 0) {
      refresh();
      return { ok: false, conflict: true, teamPublishedAt: teamPublishedAt ?? publishedAt };
    }
  } else {
    const { error } = await supabase.from("documents").insert({ id: doc.id, ...row });
    // 23505: someone else inserted the same id first.
    if (error?.code === "23505") {
      refresh();
      return { ok: false, conflict: true, teamPublishedAt: publishedAt };
    }
    if (error) return { ok: false, message: `Could not share this page: ${error.message}` };
  }

  // Blocks are replaced wholesale: the local file is the source of truth for
  // their order and content, so there is nothing to merge.
  const { error: clearError } = await supabase.from("blocks").delete().eq("document_id", doc.id);
  if (clearError) return { ok: false, message: `Could not update this page's content: ${clearError.message}` };

  if (texts.length > 0) {
    const { error: blocksError } = await supabase
      .from("blocks")
      .insert(texts.map((text, position) => ({ document_id: doc.id, position, block_type: "markdown", content: { text } })));
    if (blocksError) return { ok: false, message: `Could not save this page's content: ${blocksError.message}` };
  }

  await markPublished(doc.id, publishedAt);
  refresh();
  return { ok: true };
}

/**
 * Replace this machine's copy with the team's newer version. Discards local
 * unpublished edits; the UI asks twice before calling it.
 */
export async function takeTeamVersion(id: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (typeof id !== "string" || !id) return { ok: false, message: "Invalid document" };
  try {
    assertWritable();
    await requireMember();
  } catch (e) {
    if (e instanceof ReadOnlyHostError || e instanceof UnauthorizedError) return { ok: false, message: e.message };
    throw e;
  }
  if (!(await readById(id))) return { ok: false, message: "Document not found" };
  const team = await fetchTeamDoc(id);
  if (!team) return { ok: false, message: "The team no longer has this page." };
  await replaceWithTeam(id, {
    title: team.title,
    docType: team.docType,
    publishedAt: team.publishedAt ?? new Date().toISOString(),
    blocks: team.blocks.map((b) => (b.type === "markdown" ? b.content.text : "")),
  });
  refresh();
  return { ok: true };
}

const MAX_QUOTE = 2000;
const MAX_CONTEXT = 200;
const MAX_COMMENT = 10_000;

export type AddCommentResult = { ok: true } | { ok: false; message: string };

/**
 * Add a comment anchored to a span of text in a published document. Never
 * touches the local file or the local-first write path: a comment lives only
 * in the team database, the same place the published text itself lives, so
 * it needs no writable disk and works on a read-only deployment.
 *
 * `quote`/`prefix`/`suffix` are the W3C Web Annotation "text quote" selector:
 * the exact selected text plus a little surrounding context, so the client
 * can re-locate it in the rendered text later (see comments/store.ts).
 */
export async function addComment(
  documentId: string,
  selection: { quote: string; prefix: string; suffix: string },
  body: string
): Promise<AddCommentResult> {
  if (typeof documentId !== "string" || !documentId) return { ok: false, message: "Invalid document" };
  const quote = typeof selection?.quote === "string" ? selection.quote.trim() : "";
  const prefix = typeof selection?.prefix === "string" ? selection.prefix.slice(0, MAX_CONTEXT) : "";
  const suffix = typeof selection?.suffix === "string" ? selection.suffix.slice(0, MAX_CONTEXT) : "";
  const text = typeof body === "string" ? body.trim() : "";
  if (!quote) return { ok: false, message: "Select some text to comment on." };
  if (!text) return { ok: false, message: "Write something before posting." };
  if (quote.length > MAX_QUOTE || text.length > MAX_COMMENT) return { ok: false, message: "That's too long." };
  if (!hasSupabase()) return { ok: false, message: "Comments need the team database, which is not connected yet." };

  try {
    await requireMember();
  } catch (e) {
    if (e instanceof UnauthorizedError) return { ok: false, message: e.message };
    throw e;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to comment." };

  const { error } = await supabase.from("comments").insert({
    document_id: documentId,
    author_id: user.id,
    author_email: user.email ?? null,
    quote,
    prefix,
    suffix,
    body: text,
  });
  // 23503: the document isn't published (no matching row in `documents`).
  if (error?.code === "23503") return { ok: false, message: "Publish this page before commenting on it." };
  if (error) return { ok: false, message: `Could not add the comment: ${error.message}` };

  refresh();
  return { ok: true };
}
