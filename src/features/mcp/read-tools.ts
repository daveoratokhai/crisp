import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { documentToMarkdown } from "../blocks/to-markdown";
import { search, toEntry } from "../search/rank";
import { teamIsNewer, type Doc } from "../workspace/doc";
import { titleCase } from "../workspace/tree";

/**
 * The read-only Crisp tools, shared by the local stdio server (mcp/server.ts)
 * and the hosted HTTP one (app/mcp/route.ts). Where the documents come from is
 * the only difference, so it is passed in. No Next imports: the stdio server
 * loads this file outside Next, and it must never write to stdout.
 */

export const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });
export const fail = (s: string) => ({ content: [{ type: "text" as const, text: s }], isError: true });

/** The documents a tool call works on, and a line telling the agent which sources are in. */
export type DocSource = () => Promise<{ docs: Doc[]; status: string }>;

function stageTitles(docs: Doc[]) {
  return Object.fromEntries(
    docs.filter((d) => d.docType === "sop" && d.process && !d.client).map((d) => [d.process!, d.title])
  );
}

function placeOf(d: Doc, stages: Record<string, string>) {
  if (d.client) return [titleCase(d.client), d.process && (stages[d.process] ?? titleCase(d.process))].filter(Boolean).join(" / ");
  return d.process ? "Processes" : "Evercrisp (internal)";
}

/** `hosted` drops the local-copy wording: on the hosted server every document is the team's. */
function whereFor(hosted: boolean) {
  return (d: Doc, stages: Record<string, string>) => {
    const place = placeOf(d, stages);
    if (hosted) return place;
    if (d.state === "local") return "My drafts (local, unpublished)";
    if (d.fromTeam) return `${place} (team, no local copy)`;
    if (teamIsNewer(d)) return `${place} (a teammate published a newer version)`;
    return place;
  };
}

export function registerReadTools(server: McpServer, getDocs: DocSource, opts: { hosted?: boolean } = {}) {
  const hosted = opts.hosted ?? false;
  const where = whereFor(hosted);
  const summary = (d: Doc, stages: Record<string, string>) =>
    `- ${d.title}  [id: ${d.id}]  ${where(d, stages)} · ${d.docType} · ${d.state} · updated ${d.updatedAt.slice(0, 10)}`;

  server.registerTool(
    "list_documents",
    {
      title: "List Crisp documents",
      description: hosted
        ? "List the team's published documents in Crisp, optionally filtered by client slug (e.g. 'givebacks') or process stage (intake, assessment, workshop, backlog)."
        : "List documents in the Crisp workspace, optionally filtered by client slug (e.g. 'givebacks'), process stage (intake, assessment, workshop, backlog) or publish state (local, published, changed).",
      inputSchema: {
        client: z.string().optional(),
        process: z.string().optional(),
        state: z.enum(["local", "published", "changed"]).optional(),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ client, process, state }) => {
      const { docs, status } = await getDocs();
      const stages = stageTitles(docs);
      const picked = docs.filter(
        (d) =>
          (!client || d.client === client.toLowerCase()) &&
          (!process || d.process === process.toLowerCase()) &&
          (!state || d.state === state)
      );
      return text(`${status}\n\n${picked.length ? picked.map((d) => summary(d, stages)).join("\n") : "No documents match."}`);
    }
  );

  server.registerTool(
    "list_clients",
    {
      title: "List clients and process stages",
      description: "The clients that have documents in Crisp, and Evercrisp's process stages in order.",
      annotations: { readOnlyHint: true },
    },
    async () => {
      const { docs } = await getDocs();
      const clients = [...new Set(docs.map((d) => d.client).filter(Boolean))] as string[];
      const stages = docs
        .filter((d) => d.docType === "sop" && d.process && !d.client)
        .sort((a, b) => (a.stageOrder ?? 99) - (b.stageOrder ?? 99));
      return text(
        [
          "Clients:",
          ...(clients.length ? clients.map((c) => `- ${titleCase(c)} (slug: ${c})`) : ["- none yet"]),
          "",
          "Process stages:",
          ...stages.map((s, i) => `${i + 1}. ${s.title} (slug: ${s.process}, SOP id: ${s.id})`),
        ].join("\n")
      );
    }
  );

  server.registerTool(
    "search_documents",
    {
      title: "Search Crisp",
      description: "Full-text search over document titles and bodies. Every word must match. Returns ids to pass to read_document.",
      inputSchema: { query: z.string().min(1), limit: z.number().int().min(1).max(50).optional() },
      annotations: { readOnlyHint: true },
    },
    async ({ query, limit }) => {
      const { docs, status } = await getDocs();
      const stages = stageTitles(docs);
      const hits = search(docs.map((d) => toEntry(d, where(d, stages))), query, limit ?? 10);
      if (!hits.length) return text(`${status}\n\nNo documents match "${query}".`);
      return text(
        `${status}\n\n` +
          hits.map((h) => `- ${h.entry.title}  [id: ${h.entry.id}]  ${h.entry.where}${h.snippet ? `\n  ${h.snippet}` : ""}`).join("\n")
      );
    }
  );

  server.registerTool(
    "read_document",
    {
      title: "Read a Crisp document",
      description: "The full document as markdown, with its metadata. Every block type is serialised to markdown.",
      inputSchema: { id: z.string().min(1) },
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => {
      const { docs } = await getDocs();
      const doc = docs.find((d) => d.id === id);
      if (!doc) return fail(`No document with id "${id}". Use search_documents or list_documents to find ids.`);
      const stages = stageTitles(docs);
      const meta = [
        `id: ${doc.id}`,
        `where: ${where(doc, stages)}`,
        `type: ${doc.docType}`,
        `state: ${doc.state}`,
        `updated: ${doc.updatedAt}`,
        doc.publishedAt ? `published: ${doc.publishedAt}` : null,
        !hosted && doc.fromTeam ? "source: team (no local copy; update_document will save one)" : null,
        !hosted && teamIsNewer(doc) ? `warning: a teammate published a newer version on ${doc.teamPublishedAt}; this is the local copy` : null,
      ].filter(Boolean);
      return text(`${meta.join("\n")}\n\n${documentToMarkdown(doc.title, doc.blocks)}`);
    }
  );
}
