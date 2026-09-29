import { describe, expect, it } from "vitest";
import type { Doc } from "../workspace/doc";
import { countBy, docSummary, exploreHref, filterDocs, NO_CLIENT, parseParams } from "./filter";

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

const docs = [
  doc({ id: "a", title: "Workshop output", client: "givebacks", process: "workshop", docType: "deliverable", updatedAt: "2026-09-29T10:00:00Z" }),
  doc({ id: "b", title: "Assessment readout", client: "givebacks", process: "assessment", updatedAt: "2026-09-27T10:00:00Z" }),
  doc({ id: "c", title: "Intake", docType: "sop", process: "intake", updatedAt: "2026-09-26T10:00:00Z" }),
  doc({ id: "d", title: "Backlog draft", client: "givebacks", state: "local", publishedAt: null, updatedAt: "2026-09-28T10:00:00Z" }),
];

describe("parseParams", () => {
  it("keeps known values and drops unknown ones", () => {
    expect(parseParams({ type: "sop", state: "local", sort: "title", q: " hi " })).toEqual({
      q: "hi", client: undefined, process: undefined, type: "sop", state: "local", sort: "title", doc: undefined,
    });
    expect(parseParams({ type: "bogus", state: "weird", sort: "nope" })).toMatchObject({ type: undefined, state: undefined, sort: undefined });
  });
});

describe("filterDocs", () => {
  it("sorts by last updated by default, or by title", () => {
    expect(filterDocs(docs, {}).map((d) => d.id)).toEqual(["a", "d", "b", "c"]);
    expect(filterDocs(docs, { sort: "title" }).map((d) => d.id)).toEqual(["b", "d", "c", "a"]);
  });

  it("stacks filters", () => {
    expect(filterDocs(docs, { client: "givebacks", state: "published" }).map((d) => d.id)).toEqual(["a", "b"]);
    expect(filterDocs(docs, { client: NO_CLIENT }).map((d) => d.id)).toEqual(["c"]);
    expect(filterDocs(docs, { process: "workshop", type: "deliverable" }).map((d) => d.id)).toEqual(["a"]);
  });

  it("searches within the other filters", () => {
    expect(filterDocs(docs, { q: "readout" }).map((d) => d.id)).toEqual(["b"]);
    expect(filterDocs(docs, { q: "readout", client: NO_CLIENT })).toEqual([]);
  });
});

describe("countBy", () => {
  it("counts each option as if its own filter were not set", () => {
    const counts = countBy(docs, { client: "givebacks", state: "local" }, "state");
    expect(Object.fromEntries(counts)).toEqual({ published: 2, local: 1 });
    expect(Object.fromEntries(countBy(docs, {}, "client"))).toEqual({ givebacks: 3, [NO_CLIENT]: 1 });
  });
});

describe("exploreHref", () => {
  it("changes one param, keeps the rest, and drops the selection", () => {
    expect(exploreHref({ client: "givebacks", doc: "a" }, { type: "sop" })).toBe("/explore?client=givebacks&type=sop");
    expect(exploreHref({ client: "givebacks" }, { client: undefined })).toBe("/explore");
    expect(exploreHref({ q: "x" }, { doc: "a" })).toBe("/explore?q=x&doc=a");
  });
});

describe("docSummary", () => {
  it("skips headings and markup, and trims to a word", () => {
    const d = doc({
      blocks: [
        { id: "1", type: "markdown", content: { text: "## Goals" } },
        { id: "2", type: "markdown", content: { text: "**Seed document.** This stands in for the [real](https://x) one." } },
        { id: "3", type: "markdown", content: { text: "- first\n- second" } },
      ],
    });
    expect(docSummary(d)).toBe("Seed document. This stands in for the real one. first second");
    expect(docSummary(d, 20)).toBe("Seed document. This…");
  });
});
