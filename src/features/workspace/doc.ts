import type { Block } from "../blocks/types";

export type DocType = "note" | "sop" | "skill" | "deliverable" | "decision";

/**
 * The three publish states. This is the distinction the whole local-first
 * model depends on, so it is computed in exactly one place (docState).
 */
export type DocState = "local" | "published" | "changed";

export type Doc = {
  id: string;
  title: string;
  docType: DocType;
  /** Client slug, or null for internal documents. */
  client: string | null;
  /** Process stage slug, or null. */
  process: string | null;
  stageOrder: number | null;
  /** ISO timestamp, or null if never published. */
  publishedAt: string | null;
  /** ISO timestamp of the last local edit. */
  updatedAt: string;
  state: DocState;
  blocks: Block[];
  /** Path relative to the workspace root. Empty for a team document with no local copy. */
  localPath: string;
  /**
   * True when this document came from the shared database and there is no
   * local copy on this machine. The first edit creates one (see actions.ts).
   */
  fromTeam?: boolean;
  /**
   * When this is a local copy and the team also has the document: when the
   * team's version was last published. Compared with `publishedAt` (the
   * version this copy is based on) to spot a teammate's newer version.
   */
  teamPublishedAt?: string | null;
};

/**
 * True when a teammate published after the version this local copy is based
 * on. A copy that was never published but shares an id with a team document
 * counts as behind too.
 */
export function teamIsNewer(doc: Pick<Doc, "publishedAt" | "teamPublishedAt">): boolean {
  if (!doc.teamPublishedAt) return false;
  if (!doc.publishedAt) return true;
  return Date.parse(doc.teamPublishedAt) > Date.parse(doc.publishedAt);
}

/**
 * Never published: local. Edited after publishing: changed. Otherwise the
 * team is looking at the same version you are: published.
 *
 * Compared as instants, not strings, so "2026-09-28T09:00:00Z" and
 * "2026-09-28T09:00:00.000Z" are correctly treated as the same moment.
 */
export function docState(publishedAt: string | null, updatedAt: string): DocState {
  if (!publishedAt) return "local";
  return Date.parse(updatedAt) > Date.parse(publishedAt) ? "changed" : "published";
}
