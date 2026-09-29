import { describe, expect, it } from "vitest";
import type { Doc } from "./doc";
import { breadcrumb, buildTree, RECENTS_LIMIT } from "./tree";

const doc = (over: Partial<Doc>): Doc => ({
  id: over.id ?? "x",
  title: over.title ?? "Untitled",
  docType: "note",
  client: null,
  process: null,
  stageOrder: null,
  publishedAt: "2026-09-28T09:00:00Z",
  updatedAt: "2026-09-28T09:00:00Z",
  state: "published",
  blocks: [],
  localPath: "x.md",
  ...over,
});

const intake = doc({ id: "p1", title: "Intake", docType: "sop", process: "intake", stageOrder: 1 });
const workshop = doc({ id: "p3", title: "Workshop", docType: "sop", process: "workshop", stageOrder: 3 });
const output = doc({ id: "gb1", title: "Workshop output", client: "givebacks", process: "workshop", state: "changed" });
const draft = doc({ id: "gb2", title: "Backlog draft", client: "givebacks", process: "workshop", state: "local", publishedAt: null });
const guide = doc({ id: "i1", title: "How Crisp works", docType: "sop" });
const all = [workshop, output, draft, intake, guide];

const idsIn = (nodes: { doc: Doc; children: { doc: Doc }[] }[]): string[] =>
  nodes.flatMap((n) => [n.doc.id, ...n.children.map((c) => c.doc.id)]);

describe("buildTree", () => {
  const tree = buildTree(all);
  const space = (slug: string) => tree.teamspaces.find((t) => t.slug === slug)!;

  it("puts a shared client document under its client and under its process stage", () => {
    expect(idsIn(space("givebacks").pages)).toContain("gb1");
    const stage = space("processes").pages.find((p) => p.doc.id === "p3")!;
    expect(stage.children.map((c) => c.doc.id)).toContain("gb1");
  });

  it("keeps local documents in Private and out of every teamspace", () => {
    expect(tree.private.map((d) => d.id)).toEqual(["gb2"]);
    for (const t of tree.teamspaces) expect(idsIn(t.pages)).not.toContain("gb2");
  });

  it("orders process stages by stage, not alphabetically", () => {
    expect(space("processes").pages.map((p) => p.doc.title)).toEqual(["Intake", "Workshop"]);
  });

  it("puts internal documents in the org teamspace, and SOPs only under Processes", () => {
    expect(idsIn(space("internal").pages)).toEqual(["i1"]);
    expect(space("internal").label).toBe("Evercrisp");
  });

  it("lists recents newest first, capped", () => {
    const many = Array.from({ length: 8 }, (_, i) =>
      doc({ id: `r${i}`, updatedAt: `2026-09-${String(10 + i).padStart(2, "0")}T00:00:00Z` })
    );
    const { recents } = buildTree(many);
    expect(recents).toHaveLength(RECENTS_LIMIT);
    expect(recents[0].id).toBe("r7");
  });
});

describe("breadcrumb", () => {
  it("follows the client route", () => {
    expect(breadcrumb(output, all, "client")).toEqual(["Givebacks", "Workshop output"]);
  });

  it("follows the process route through the stage's real title", () => {
    expect(breadcrumb(output, all, "process")).toEqual(["Processes", "Workshop", "Workshop output"]);
  });

  it("is just the title for a local document", () => {
    expect(breadcrumb(draft, all, "client")).toEqual(["Backlog draft"]);
  });

  it("places SOPs under Processes and internal docs under the org", () => {
    expect(breadcrumb(workshop, all)).toEqual(["Processes", "Workshop"]);
    expect(breadcrumb(guide, all)).toEqual(["Evercrisp", "How Crisp works"]);
  });
});
