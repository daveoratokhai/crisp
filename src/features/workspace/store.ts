import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { joinMarkdown, splitMarkdown } from "../blocks/split";
import { docState, type Doc, type DocType } from "./doc";

/**
 * The local workspace on disk: a folder of markdown files with frontmatter.
 * Plain Node, no Next imports, so the app and the MCP server share it.
 * (Relative imports for the same reason: the MCP server runs outside Next.)
 *
 * Writes only ever touch files that already exist in the workspace (found by
 * id) or new files whose names are slugs Crisp generated itself, so no
 * caller-supplied path can reach outside the workspace folder.
 */

export function workspaceRoot() {
  return process.env.CRISP_WORKSPACE ?? path.join(process.cwd(), "workspace");
}

export async function readAll(root = workspaceRoot()): Promise<Doc[]> {
  const files = await findMarkdown(root);
  const docs = await Promise.all(files.map((file) => readDoc(root, file)));
  return docs.sort((a, b) => a.title.localeCompare(b.title));
}

export async function readById(id: string, root = workspaceRoot()): Promise<Doc | undefined> {
  return (await readAll(root)).find((d) => d.id === id);
}

/** Replace a document's body. Marks it edited now, so a published document becomes "changed". */
export async function saveBody(id: string, blocks: string[], root = workspaceRoot()): Promise<Doc> {
  return update(id, root, (data) => ({ data, content: joinMarkdown(blocks) }));
}

export async function saveTitle(id: string, title: string, root = workspaceRoot()): Promise<Doc> {
  const clean = title.trim();
  if (!clean) throw new Error("A title cannot be empty");
  return update(id, root, (data, content) => ({ data: { ...data, title: clean }, content }));
}

/**
 * Record that a document was just published. Leaves `updated_at` untouched:
 * `docState()` reads "published" whenever `published_at >= updated_at`, so
 * publishing must not also look like an edit, or it would immediately read
 * "changed" again.
 */
export async function markPublished(id: string, publishedAt: string, root = workspaceRoot()): Promise<Doc> {
  return update(id, root, (data, content) => ({ data: { ...data, published_at: publishedAt }, content }), { touch: false });
}

export type NewDoc = {
  title?: string;
  body?: string;
  docType?: DocType;
  client?: string | null;
  process?: string | null;
};

/** Create a local (unpublished) document. Returns it. */
export async function createDoc(input: NewDoc = {}, root = workspaceRoot()): Promise<Doc> {
  const title = input.title?.trim() || "Untitled";
  const client = input.client ? slugify(input.client) : null;
  const dir = client ? path.join(root, "clients", client) : path.join(root, "internal");
  await fs.mkdir(dir, { recursive: true });

  const base = slugify(title) || "untitled";
  const file = await uniquePath(dir, base);
  const id = `${base}-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const data: Record<string, unknown> = { id, title, doc_type: input.docType ?? "note", updated_at: now };
  if (client) data.client = client;
  if (input.process) data.process = slugify(input.process);

  await fs.writeFile(file, matter.stringify(input.body ? `\n${input.body.trim()}\n` : "\n", data), "utf8");
  return readDoc(root, file);
}

export type ImportedDoc = {
  id: string;
  title: string;
  docType: DocType;
  client: string | null;
  process: string | null;
  stageOrder: number | null;
  publishedAt: string;
  blocks: string[];
};

/**
 * Save a local copy of a team document, keeping its id, so it can be edited
 * here and published again as the same document. It lands exactly as
 * published (updated_at = published_at, so it reads "Published") until the
 * first edit changes it.
 *
 * Files where a hand-written one would go: a client's folder, processes/ for a
 * stage SOP, otherwise internal/. Refuses to overwrite an existing local copy.
 */
export async function importDoc(input: ImportedDoc, root = workspaceRoot()): Promise<Doc> {
  if (await readById(input.id, root)) throw new Error(`A local copy of ${input.id} already exists`);

  const client = input.client ? slugify(input.client) : null;
  const isStageSop = input.docType === "sop" && Boolean(input.process) && !client;
  const dir = client ? path.join(root, "clients", client) : path.join(root, isStageSop ? "processes" : "internal");
  await fs.mkdir(dir, { recursive: true });
  const file = await uniquePath(dir, slugify(input.title) || "untitled");

  const data: Record<string, unknown> = {
    id: input.id,
    title: input.title,
    doc_type: input.docType,
    published_at: input.publishedAt,
    updated_at: input.publishedAt,
  };
  if (client) data.client = client;
  if (input.process) data.process = input.process;
  if (input.stageOrder != null && isStageSop) data.stage_order = input.stageOrder;

  const body = joinMarkdown(input.blocks);
  await fs.writeFile(file, matter.stringify(body ? `\n${body}\n` : "\n", data), "utf8");
  return readDoc(root, file);
}

/**
 * Replace a local copy with the team's version: title, type and body, and
 * mark it as that version, so it reads "Published". Discards any unpublished
 * local edits, which is why the UI asks twice before calling this. The file
 * stays where it is; the id never changes.
 */
export async function replaceWithTeam(
  id: string,
  team: Pick<ImportedDoc, "title" | "docType" | "publishedAt" | "blocks">,
  root = workspaceRoot()
): Promise<Doc> {
  return update(
    id,
    root,
    (data) => ({
      data: { ...data, title: team.title, doc_type: team.docType, published_at: team.publishedAt, updated_at: team.publishedAt },
      content: joinMarkdown(team.blocks),
    }),
    { touch: false }
  );
}

async function update(
  id: string,
  root: string,
  change: (data: Record<string, unknown>, content: string) => { data: Record<string, unknown>; content: string },
  { touch = true }: { touch?: boolean } = {}
): Promise<Doc> {
  const doc = await readById(id, root);
  if (!doc) throw new Error(`No document with id ${id}`);
  const file = path.join(root, doc.localPath);
  const { data, content } = matter(await fs.readFile(file, "utf8"));
  const next = change(data, content);
  if (touch) {
    // An edit must always read as after the last publish. published_at can
    // come from a teammate's machine whose clock is ahead of this one, so
    // "now" alone could land before it and the edit would still read
    // "published". Stamp at least a millisecond after publishing instead.
    const now = Date.now();
    const published = next.data.published_at != null ? Date.parse(String(toIso(next.data.published_at))) : NaN;
    next.data.updated_at = new Date(Number.isNaN(published) ? now : Math.max(now, published + 1)).toISOString();
  }
  const body = next.content.trim();
  await fs.writeFile(file, matter.stringify(body ? `\n${body}\n` : "\n", next.data), "utf8");
  return readDoc(root, file);
}

async function findMarkdown(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return []; // A missing workspace is an empty workspace, not a crash.
  }
  const nested = await Promise.all(
    entries
      .filter((e) => !e.name.startsWith("."))
      .map((e) => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) return findMarkdown(full);
        return Promise.resolve(e.name.endsWith(".md") ? [full] : []);
      })
  );
  return nested.flat();
}

async function readDoc(root: string, file: string): Promise<Doc> {
  const raw = await fs.readFile(file, "utf8");
  const { data, content } = matter(raw);
  const localPath = path.relative(root, file);

  const publishedAt = toIso(data.published_at);
  // Fall back to the file's own modified time when frontmatter omits it,
  // so a document written by hand still gets an honest state.
  const updatedAt = toIso(data.updated_at) ?? (await fs.stat(file)).mtime.toISOString();

  return {
    id: String(data.id ?? localPath),
    title: String(data.title ?? path.basename(file, ".md")),
    docType: (data.doc_type as DocType) ?? "note",
    client: data.client ? String(data.client) : null,
    process: data.process ? String(data.process) : null,
    stageOrder: data.stage_order != null ? Number(data.stage_order) : null,
    publishedAt,
    updatedAt,
    state: docState(publishedAt, updatedAt),
    // The file stays plain markdown so any editor works; Crisp reads it as
    // one markdown block per paragraph, list, table, quote or code fence.
    blocks: splitMarkdown(content).map((text, i) => ({
      id: `${localPath}#${i}`,
      type: "markdown" as const,
      content: { text },
    })),
    localPath,
  };
}

async function uniquePath(dir: string, base: string): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = path.join(dir, n === 1 ? `${base}.md` : `${base}-${n}.md`);
    try {
      await fs.access(candidate);
    } catch {
      return candidate;
    }
  }
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** gray-matter parses ISO timestamps into Dates. Normalise to strings. */
function toIso(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}
