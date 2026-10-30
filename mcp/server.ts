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
 * create_document and update_document write LOCAL (unpublished) files.
 * Editing a teammate's document saves a local copy first, as the app does.
 * Only publish_document shares with the team, and only when the user asks
 * (added 2026-10-05 at Dave's explicit request; see the vault decision log).
 *
 * The read tools live in src/features/mcp/read-tools.ts, shared with the
 * hosted HTTP server (src/app/mcp/route.ts), which reads published documents only.
 *
 * stdout carries the protocol, so this file must never console.log.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { joinMarkdown, splitMarkdown } from "../src/features/blocks/split";
import { fail, registerReadTools, text } from "../src/features/mcp/read-tools";
import type { Doc } from "../src/features/workspace/doc";
import { createDoc, importDoc, markPublished, readAll, readById, saveBody, workspaceRoot } from "../src/features/workspace/store";
import { mergeDocs, rowToDoc, TEAM_SELECT, type TeamRow } from "../src/features/workspace/team";
import { agentClient, hasSessionFile, supabaseEnv } from "./session";
import { titleCase } from "../src/features/workspace/tree";

const DOC_TYPES = ["note", "sop", "skill", "deliverable", "decision"] as const;

const server = new McpServer({ name: "crisp", version: "0.1.0" });


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

registerReadTools(server, allDocs);

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

server.registerTool(
  "publish_document",
  {
    title: "Publish (share) a Crisp document to the team",
    description:
      "Publish a local document to the shared team database — the same one-way gate the app's own Share button triggers. Visible to the whole team afterward. Only call this when the user has explicitly asked to publish/share this specific document; this writes to shared state, not just this machine.",
    inputSchema: {
      id: z.string().min(1),
      overwrite: z.boolean().optional().describe("Required to proceed when a teammate published a newer version than this local copy is based on."),
    },
    annotations: { destructiveHint: true, idempotentHint: false },
  },
  async ({ id, overwrite }) => {
    const env = supabaseEnv();
    if (!env) return fail("Team database is not connected (no Supabase keys in .env.local).");
    if (!(await hasSessionFile())) return fail("Not signed in. Run `npm run mcp:login` in the crisp folder, then try again.");

    const doc = await readById(id);
    if (!doc) return fail(`No local document with id "${id}". Use list_documents to find ids.`);

    const supabase = agentClient(env);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return fail("Sign-in expired. Run `npm run mcp:login` again.");

    const { data: member, error: memberError } = await supabase.from("team_members").select("user_id").eq("user_id", user.id).maybeSingle();
    if (memberError || !member) return fail("This account is not on the Crisp team (no team_members row).");

    // What the team has right now, if anything — mirrors publishDoc's conflict check.
    const { data: existing, error: readError } = await supabase.from("documents").select("published_at").eq("id", doc.id).maybeSingle();
    if (readError) return fail(`Could not check the team's copy: ${readError.message}`);

    const teamPublishedAt = existing ? new Date(existing.published_at).toISOString() : null;
    const behind = teamPublishedAt && (!doc.publishedAt || Date.parse(teamPublishedAt) > Date.parse(doc.publishedAt));
    if (behind && !overwrite) {
      return fail(
        `A teammate published a newer version of "${doc.title}" on ${teamPublishedAt}. Confirm with the user that overwriting is intended, then call again with overwrite: true.`
      );
    }

    let clientId: string | null = null;
    if (doc.client) {
      const { data, error } = await supabase
        .from("clients")
        .upsert({ slug: doc.client, name: titleCase(doc.client) }, { onConflict: "slug" })
        .select("id")
        .single();
      if (error) return fail(`Could not record the client: ${error.message}`);
      clientId = data.id;
    }

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
      const { data: updated, error } = await supabase
        .from("documents")
        .update(row)
        .eq("id", doc.id)
        .eq("published_at", existing.published_at)
        .select("id");
      if (error) return fail(`Could not share this page: ${error.message}`);
      if (!updated || updated.length === 0) {
        return fail(`Someone published "${doc.title}" in between. Re-run list_documents/read_document and try again.`);
      }
    } else {
      const { error } = await supabase.from("documents").insert({ id: doc.id, ...row });
      if (error?.code === "23505") return fail(`Someone else just published a document with id "${doc.id}". Re-check and try again.`);
      if (error) return fail(`Could not share this page: ${error.message}`);
    }

    const { error: clearError } = await supabase.from("blocks").delete().eq("document_id", doc.id);
    if (clearError) return fail(`Could not update this page's content: ${clearError.message}`);

    if (texts.length > 0) {
      const { error: blocksError } = await supabase
        .from("blocks")
        .insert(texts.map((text, position) => ({ document_id: doc.id, position, block_type: "markdown", content: { text } })));
      if (blocksError) return fail(`Could not save this page's content: ${blocksError.message}`);
    }

    await markPublished(doc.id, publishedAt);
    return text(`Published "${doc.title}" [id: ${doc.id}] to the team. It's now visible to everyone on Crisp, as if the Share button had been pressed in the app.`);
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
