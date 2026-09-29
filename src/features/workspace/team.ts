import { splitMarkdown } from "../blocks/split";
import type { Block } from "../blocks/types";
import type { Doc, DocType } from "./doc";

/**
 * Team documents: what has been published to the shared database, turned
 * into the same `Doc` shape the app uses for local files. Pure functions, no
 * Supabase import, so they can be tested (the fetch lives in team-fetch.ts).
 */

/** One row of `documents` with its client, process and blocks embedded. */
export type TeamRow = {
  id: string;
  title: string;
  doc_type: string;
  body_markdown: string | null;
  published_at: string;
  // PostgREST returns a to-one embed as an object; tolerate an array too.
  clients: { slug: string } | { slug: string }[] | null;
  processes: { slug: string; stage_order: number } | { slug: string; stage_order: number }[] | null;
  blocks: { position: number; block_type: string; content: unknown }[] | null;
};

/** Columns and embeds for a team document. Shared by the app and the MCP server. */
export const TEAM_SELECT =
  "id, title, doc_type, body_markdown, published_at, clients(slug), processes(slug, stage_order), blocks(position, block_type, content)";

const DOC_TYPES: DocType[] = ["note", "sop", "skill", "deliverable", "decision"];

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export function rowToDoc(row: TeamRow): Doc {
  const client = one(row.clients);
  const process = one(row.processes);
  const publishedAt = new Date(row.published_at).toISOString();

  // Markdown is the only block type written today; anything else is skipped
  // rather than rendered wrongly. If the blocks are missing, the stored
  // markdown body is the fallback, so a document is never shown empty.
  const texts = (row.blocks ?? [])
    .filter((b) => b.block_type === "markdown")
    .sort((a, b) => a.position - b.position)
    .map((b) => {
      const text = (b.content as { text?: unknown } | null)?.text;
      return typeof text === "string" ? text : "";
    });
  const bodyTexts = texts.length ? texts : splitMarkdown(row.body_markdown ?? "");

  const blocks: Block[] = bodyTexts.map((text, i) => ({ id: `team:${row.id}#${i}`, type: "markdown", content: { text } }));

  return {
    id: row.id,
    title: row.title,
    docType: DOC_TYPES.includes(row.doc_type as DocType) ? (row.doc_type as DocType) : "note",
    client: client?.slug ?? null,
    process: process?.slug ?? null,
    stageOrder: process?.stage_order ?? null,
    publishedAt,
    // Nobody here has edited it since it was published.
    updatedAt: publishedAt,
    state: "published",
    blocks,
    localPath: "",
    fromTeam: true,
  };
}

/**
 * Local and team documents together. A local copy always wins: it may hold
 * edits that have not been published yet, and it is what the editor writes to.
 */
export function mergeDocs(local: Doc[], team: Doc[]): Doc[] {
  const teamById = new Map(team.map((d) => [d.id, d]));
  const localIds = new Set(local.map((d) => d.id));
  // Local copies carry the team's publish time, so a newer version can be flagged.
  const annotated = local.map((d) => (teamById.has(d.id) ? { ...d, teamPublishedAt: teamById.get(d.id)!.publishedAt } : d));
  return [...annotated, ...team.filter((d) => !localIds.has(d.id))].sort((a, b) => a.title.localeCompare(b.title));
}
