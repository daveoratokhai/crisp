/**
 * Crisp's MCP server: lets Claude Code (or any MCP client) search, read and
 * write the Crisp workspace. It uses the same store as the app, so a document
 * written here appears in the app on its next render, and vice versa.
 *
 * Run:      npm run mcp            (stdio)
 * Register: claude mcp add crisp -- npm --prefix "<path to crisp>" run mcp --silent
 *
 * Reads include the team's published documents once the server is signed
 * in (`npm run mcp:login`, see session.ts), with row-level security applying
 * exactly as it does to you. Without a session it reads local files only and
 * says so.
 *
 * Everything written is LOCAL (unpublished). Editing a teammate's document
 * saves a local copy first, as the app does. Publishing to the team is a
 * deliberate human action in the app, never something an agent does here.
 *
 * stdout carries the protocol, so this file must never console.log.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { splitMarkdown } from "../src/features/blocks/split";
import { documentToMarkdown } from "../src/features/blocks/to-markdown";
import { search, toEntry } from "../src/features/search/rank";
import { teamIsNewer, type Doc } from "../src/features/workspace/doc";
import { createDoc, importDoc, readAll, readById, saveBody, workspaceRoot } from "../src/features/workspace/store";
import { mergeDocs, rowToDoc, TEAM_SELECT, type TeamRow } from "../src/features/workspace/team";
import { agentClient, hasSessionFile, supabaseEnv } from "./session";
import { titleCase } from "../src/features/workspace/tree";

const DOC_TYPES = ["note", "sop", "skill", "deliverable", "decision"] as const;

const server = new McpServer({ name: "crisp", version: "0.1.0" });

const text = (s: string) => ({ content: [{ type: "text" as const, text: s }] });
const fail = (s: string) => ({ content: [{ type: "text" as const, text: s }], isError: true });

/**
 * Local documents plus the team's, and a line saying which. Never throws: if
 * the team cannot be reached, the agent still works on local documents.
 */
async function allDocs(): Promise<{ docs: Doc[]; status: string }> {
  const local = await readAll();
  const env = supabaseEnv();
  if (!env) return { docs: local, status: "Team documents: unavailable (no Supabase keys). Showing local documents only." };
  if (!(await hasSessionFile()))
    return { docs: local, status: "Team documents: not signed in. Showing local documents only. Ask the user to run `npm run mcp:login` in the crisp folder." };
  try {
    const supabase = agentClient(env);
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session)
      return { docs: local, status: "Team documents: sign-in expired. Showing local documents only. Ask the user to run `npm run mcp:login` again." };
    const { data, error } = await supabase.from("documents").select(TEAM_SELECT);
    if (error) return { docs: local, status: `Team documents: could not load (${error.message}). Showing local documents only.` };
    const team = (data as unknown as TeamRow[]).map(rowToDoc);
    return { docs: mergeDocs(local, team), status: `Team documents: included (signed in as ${auth.session.user.email}).` };
  } catch (err) {
    return { docs: local, status: `Team documents: could not load (${err instanceof Error ? err.message : String(err)}). Showing local documents only.` };
  }
}

function stageTitles(docs: Doc[]) {
  return Object.fromEntries(
    docs.filter((d) => d.docType === "sop" && d.process && !d.client).map((d) => [d.process!, d.title])
  );
}

function where(d: Doc, stages: Record<string, string>) {
  if (d.state === "local") return "My drafts (local, unpublished)";
  const place = placeOf(d, stages);
  if (d.fromTeam) return `${place} (team, no local copy)`;
  if (teamIsNewer(d)) return `${place} (a teammate published a newer version)`;
  return place;
}

function placeOf(d: Doc, stages: Record<string, string>) {
  if (d.client) return [titleCase(d.client), d.process && (stages[d.process] ?? titleCase(d.process))].filter(Boolean).join(" / ");
  return d.process ? "Processes" : "Evercrisp (internal)";
}

function summary(d: Doc, stages: Record<string, string>) {
  return `- ${d.title}  [id: ${d.id}]  ${where(d, stages)} · ${d.docType} · ${d.state} · updated ${d.updatedAt.slice(0, 10)}`;
}

server.registerTool(
  "list_documents",
  {
    title: "List Crisp documents",
    description:
      "List documents in the Crisp workspace, optionally filtered by client slug (e.g. 'givebacks'), process stage (intake, assessment, workshop, backlog) or publish state (local, published, changed).",
    inputSchema: {
      client: z.string().optional(),
      process: z.string().optional(),
      state: z.enum(["local", "published", "changed"]).optional(),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ client, process, state }) => {
    const { docs, status } = await allDocs();
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
    const { docs } = await allDocs();
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
    const { docs, status } = await allDocs();
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
    const { docs } = await allDocs();
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
      doc.fromTeam ? "source: team (no local copy; update_document will save one)" : null,
      teamIsNewer(doc) ? `warning: a teammate published a newer version on ${doc.teamPublishedAt}; this is the local copy` : null,
    ].filter(Boolean);
    return text(`${meta.join("\n")}\n\n${documentToMarkdown(doc.title, doc.blocks)}`);
  }
);

server.registerTool(
  "create_document",
  {
    title: "Create a Crisp document",
    description:
      "Create a new LOCAL document (visible only in the owner's Private section until they publish it). Optionally file it under a client and a process stage.",
    inputSchema: {
      title: z.string().min(1).max(300),
      body: z.string().max(1_000_000).optional(),
      doc_type: z.enum(DOC_TYPES).optional(),
      client: z.string().max(60).optional(),
      process: z.string().max(60).optional(),
    },
  },
  async ({ title, body, doc_type, client, process }) => {
    const doc = await createDoc({ title, body, docType: doc_type, client, process });
    return text(`Created "${doc.title}" [id: ${doc.id}] as a local document at ${doc.localPath}.`);
  }
);

server.registerTool(
  "update_document",
  {
    title: "Replace a Crisp document's body",
    description:
      "Replace the whole body of an existing document with new markdown. Read it first. Editing a published document marks it 'Unpublished changes'; it does not publish.",
    inputSchema: { id: z.string().min(1), body: z.string().max(1_000_000) },
    annotations: { destructiveHint: true, idempotentHint: true },
  },
  async ({ id, body }) => {
    let copied = false;
    if (!(await readById(id))) {
      // A teammate's document: save a local copy with the same id first, as the app does.
      const team = (await allDocs()).docs.find((d) => d.id === id && d.fromTeam);
      if (!team) return fail(`No document with id "${id}".`);
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
      copied = true;
    }
    const doc = await saveBody(id, splitMarkdown(body));
    return text(
      `Saved "${doc.title}" [id: ${doc.id}]${copied ? " as a new local copy of the team's document" : ""}. State is now: ${doc.state}. Not published; the user shares it from the app.`
    );
  }
);

async function main() {
  await server.connect(new StdioServerTransport());
  // stderr is safe for diagnostics; stdout is the protocol.
  console.error(`crisp MCP server ready (workspace: ${workspaceRoot()})`);
}

main().catch((err) => {
  console.error("crisp MCP server failed:", err);
  process.exit(1);
});
