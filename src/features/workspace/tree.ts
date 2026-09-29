import type { Doc } from "./doc";

/**
 * The sidebar, arranged the way Notion arranges it, with Crisp's meaning:
 *
 *   Recents     recently edited documents
 *   Private     local documents. Only you can see them, which is exactly
 *               what Notion's "Private" means.
 *   Teamspaces  what the team can see:
 *                 one per client (its published documents)
 *                 Processes (each stage's SOP, client work nested inside)
 *                 Evercrisp (internal documents)
 *
 * A published client document therefore appears twice, under its client and
 * under its process stage. That keeps the two routes to every document.
 */

export type Via = "client" | "process";

export type PageNode = { doc: Doc; via?: Via; children: PageNode[] };

export type Teamspace = { slug: string; label: string; badge: string; pages: PageNode[] };

export type SidebarTree = {
  recents: Doc[];
  private: Doc[];
  teamspaces: Teamspace[];
};

export const RECENTS_LIMIT = 5;

export function buildTree(docs: Doc[], orgName = "Evercrisp"): SidebarTree {
  const stages = processStages(docs);
  const stageRank = (slug: string | null) => {
    const i = stages.findIndex((s) => s.process === slug);
    return i === -1 ? 999 : i;
  };

  const shared = docs.filter((d) => d.state !== "local");
  const clientDocs = shared.filter((d) => d.client);
  const clients = unique(clientDocs.map((d) => d.client!)).sort();

  const clientSpaces: Teamspace[] = clients.map((client) => ({
    slug: client,
    label: titleCase(client),
    badge: titleCase(client).charAt(0),
    pages: clientDocs
      .filter((d) => d.client === client)
      .sort((a, b) => stageRank(a.process) - stageRank(b.process) || a.title.localeCompare(b.title))
      .map((doc) => ({ doc, via: "client", children: [] })),
  }));

  const processSpace: Teamspace = {
    slug: "processes",
    label: "Processes",
    badge: "P",
    pages: stages
      .filter((s) => s.state !== "local")
      .map((stage) => ({
        doc: stage,
        via: "process",
        children: clientDocs
          .filter((d) => d.process === stage.process)
          .sort((a, b) => (a.client ?? "").localeCompare(b.client ?? "") || a.title.localeCompare(b.title))
          .map((doc) => ({ doc, via: "process", children: [] })),
      })),
  };

  const internal = shared.filter((d) => !d.client && !isStageSop(d));
  const orgSpace: Teamspace = {
    slug: "internal",
    label: orgName,
    badge: orgName.charAt(0),
    pages: internal.map((doc) => ({ doc, children: [] })),
  };

  return {
    recents: [...docs].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, RECENTS_LIMIT),
    private: docs.filter((d) => d.state === "local"),
    teamspaces: [...clientSpaces, processSpace, orgSpace].filter((t) => t.pages.length > 0),
  };
}

/**
 * The breadcrumb follows the route taken, like Notion's page path:
 *   from a client     Givebacks / Workshop output
 *   from Processes    Processes / Workshop / Workshop output
 *   internal          Evercrisp / How Crisp works
 *   local             just the title (the top bar shows "Private")
 */
export function breadcrumb(doc: Doc, docs: Doc[], via?: Via, orgName = "Evercrisp"): string[] {
  if (doc.state === "local") return [doc.title];
  if (isStageSop(doc)) return ["Processes", doc.title];
  if (!doc.client) return [orgName, doc.title];
  if (via === "process" && doc.process) {
    const stage = processStages(docs).find((s) => s.process === doc.process);
    return ["Processes", stage?.title ?? titleCase(doc.process), doc.title];
  }
  return [titleCase(doc.client), doc.title];
}

/** The process SOPs define the stages and their order. */
function processStages(docs: Doc[]): Doc[] {
  return docs.filter(isStageSop).sort((a, b) => (a.stageOrder ?? 99) - (b.stageOrder ?? 99));
}

function isStageSop(d: Doc): boolean {
  return d.docType === "sop" && Boolean(d.process) && !d.client;
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

export function titleCase(slug: string) {
  return slug.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
