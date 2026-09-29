import { describe, expect, it } from "vitest";
import type { Doc } from "./doc";
import { mergeDocs, rowToDoc, type TeamRow } from "./team";

const row = (over: Partial<TeamRow> = {}): TeamRow => ({
  id: "gb-plan",
  title: "Plan",
  doc_type: "deliverable",
  body_markdown: "One\n\nTwo",
  published_at: "2026-09-29T10:00:00+00:00",
  clients: { slug: "givebacks" },
  processes: { slug: "workshop", stage_order: 3 },
  blocks: [
    { position: 1, block_type: "markdown", content: { text: "Second" } },
    { position: 0, block_type: "markdown", content: { text: "First" } },
  ],
  ...over,
});

describe("rowToDoc", () => {
  it("turns a published row into a team document that reads as published", () => {
    const doc = rowToDoc(row());
    expect(doc).toMatchObject({
      id: "gb-plan",
      docType: "deliverable",
      client: "givebacks",
      process: "workshop",
      stageOrder: 3,
      state: "published",
      fromTeam: true,
      localPath: "",
      publishedAt: "2026-09-29T10:00:00.000Z",
      updatedAt: "2026-09-29T10:00:00.000Z",
    });
  });

  it("orders blocks by position", () => {
    expect(rowToDoc(row()).blocks.map((b) => (b.type === "markdown" ? b.content.text : ""))).toEqual(["First", "Second"]);
  });

  it("falls back to the stored markdown when there are no blocks", () => {
    const doc = rowToDoc(row({ blocks: [] }));
    expect(doc.blocks.map((b) => (b.type === "markdown" ? b.content.text : ""))).toEqual(["One", "Two"]);
  });

  it("accepts embeds as arrays and handles internal documents", () => {
    expect(rowToDoc(row({ clients: [{ slug: "acme" }] })).client).toBe("acme");
    expect(rowToDoc(row({ clients: null, processes: null })).client).toBeNull();
  });

  it("treats an unknown doc type as a note rather than trusting it", () => {
    expect(rowToDoc(row({ doc_type: "weird" })).docType).toBe("note");
  });
});

describe("mergeDocs", () => {
  const local = { ...rowToDoc(row()), fromTeam: undefined, localPath: "clients/givebacks/plan.md", title: "Plan (my copy)" } as Doc;
  const other = rowToDoc(row({ id: "ben-notes", title: "Ben's notes" }));

  it("keeps the local copy when both exist, and adds team-only documents", () => {
    const merged = mergeDocs([local], [rowToDoc(row()), other]);
    expect(merged.map((d) => d.id)).toEqual(["ben-notes", "gb-plan"]);
    expect(merged.find((d) => d.id === "gb-plan")?.title).toBe("Plan (my copy)");
    expect(merged.find((d) => d.id === "ben-notes")?.fromTeam).toBe(true);
  });
});

describe("teamIsNewer", () => {
  it("flags a local copy when a teammate published after the version it is based on", async () => {
    const { teamIsNewer } = await import("./doc");
    expect(teamIsNewer({ publishedAt: "2026-09-29T10:00:00Z", teamPublishedAt: "2026-09-29T11:00:00Z" })).toBe(true);
    expect(teamIsNewer({ publishedAt: "2026-09-29T11:00:00Z", teamPublishedAt: "2026-09-29T11:00:00.000Z" })).toBe(false);
    expect(teamIsNewer({ publishedAt: null, teamPublishedAt: "2026-09-29T11:00:00Z" })).toBe(true);
    expect(teamIsNewer({ publishedAt: "2026-09-29T10:00:00Z", teamPublishedAt: null })).toBe(false);
  });

  it("is carried onto local copies by mergeDocs", () => {
    const localCopy = { ...rowToDoc(row()), fromTeam: undefined, localPath: "x.md", publishedAt: "2026-09-29T09:00:00.000Z" } as Doc;
    const [merged] = mergeDocs([localCopy], [rowToDoc(row())]);
    expect(merged.teamPublishedAt).toBe("2026-09-29T10:00:00.000Z");
  });
});
