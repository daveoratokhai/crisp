import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import matter from "gray-matter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDoc, importDoc, markPublished, readAll, readById, replaceWithTeam, saveBody, saveTitle } from "./store";

let root: string;

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "crisp-store-"));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

const write = (rel: string, text: string) =>
  fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true }).then(() => fs.writeFile(path.join(root, rel), text));

describe("store", () => {
  it("creates a local document in internal/ by default", async () => {
    const doc = await createDoc({ title: "Kickoff notes" }, root);
    expect(doc.state).toBe("local");
    expect(doc.localPath).toBe(path.join("internal", "kickoff-notes.md"));
    expect((await readAll(root)).map((d) => d.id)).toEqual([doc.id]);
  });

  it("files a client document under that client and never collides", async () => {
    const a = await createDoc({ title: "Plan", client: "Givebacks" }, root);
    const b = await createDoc({ title: "Plan", client: "Givebacks" }, root);
    expect(a.localPath).toBe(path.join("clients", "givebacks", "plan.md"));
    expect(b.localPath).toBe(path.join("clients", "givebacks", "plan-2.md"));
  });

  it("saves blocks as one markdown body", async () => {
    const doc = await createDoc({ title: "Doc" }, root);
    const saved = await saveBody(doc.id, ["# Hi", "", "Para"], root);
    expect(saved.blocks.map((b) => (b.type === "markdown" ? b.content.text : ""))).toEqual(["# Hi", "Para"]);
  });

  it("turns a published document into 'changed' when edited, and keeps its other frontmatter", async () => {
    await write(
      "processes/01-intake.md",
      "---\nid: proc-intake\ntitle: Intake\ndoc_type: sop\nprocess: intake\nstage_order: 1\npublished_at: 2026-09-01T00:00:00Z\nupdated_at: 2026-09-01T00:00:00Z\n---\n\nOld body\n"
    );
    expect((await readById("proc-intake", root))?.state).toBe("published");

    const saved = await saveBody("proc-intake", ["New body"], root);
    expect(saved.state).toBe("changed");

    const { data } = matter(await fs.readFile(path.join(root, "processes/01-intake.md"), "utf8"));
    expect(data).toMatchObject({ id: "proc-intake", doc_type: "sop", process: "intake", stage_order: 1 });
  });

  it("renames without moving the file or changing the id", async () => {
    const doc = await createDoc({ title: "Draft" }, root);
    const renamed = await saveTitle(doc.id, "  Final  ", root);
    expect(renamed).toMatchObject({ id: doc.id, title: "Final", localPath: doc.localPath });
    await expect(saveTitle(doc.id, "   ", root)).rejects.toThrow();
  });

  it("marks a document published without touching updated_at, so it reads 'published' rather than 'changed'", async () => {
    const doc = await createDoc({ title: "To publish", client: "Givebacks", process: "workshop" }, root);
    expect(doc.state).toBe("local");

    // Published at the same instant as the last edit: equal reads as published.
    const publishedAt = doc.updatedAt;
    const published = await markPublished(doc.id, publishedAt, root);
    expect(published.state).toBe("published");
    expect(published.updatedAt).toBe(doc.updatedAt);
    expect(published.publishedAt).toBe(publishedAt);

    const { data } = matter(await fs.readFile(path.join(root, doc.localPath), "utf8"));
    expect(data).toMatchObject({ id: doc.id, client: "givebacks", process: "workshop", doc_type: "note" });

    // Editing after publishing flips it to "changed", as before. The pause
    // guarantees a strictly later timestamp at millisecond resolution.
    await new Promise((r) => setTimeout(r, 10));
    const edited = await saveBody(doc.id, ["New content"], root);
    expect(edited.state).toBe("changed");
  });

  it("imports a team document as a local copy with the same id, reading 'published' until edited", async () => {
    const imported = await importDoc(
      {
        id: "ben-plan-x1",
        title: "Ben's plan",
        docType: "deliverable",
        client: "givebacks",
        process: "workshop",
        stageOrder: null,
        publishedAt: "2026-09-29T10:00:00.000Z",
        blocks: ["## Plan", "Step one"],
      },
      root
    );
    expect(imported).toMatchObject({ id: "ben-plan-x1", state: "published", client: "givebacks", process: "workshop" });
    expect(imported.localPath).toBe(path.join("clients", "givebacks", "ben-s-plan.md"));
    expect(imported.blocks.map((b) => (b.type === "markdown" ? b.content.text : ""))).toEqual(["## Plan", "Step one"]);

    const edited = await saveBody("ben-plan-x1", ["## Plan", "Step one, revised"], root);
    expect(edited.state).toBe("changed");

    await expect(importDoc({ ...imported, blocks: [], publishedAt: imported.publishedAt! }, root)).rejects.toThrow(/already exists/);
  });

  it("still reads an edit as 'changed' when the publisher's clock was ahead of this machine's", async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // published "an hour from now"
    await importDoc(
      { id: "skewed", title: "Skewed", docType: "note", client: null, process: null, stageOrder: null, publishedAt: future, blocks: ["a"] },
      root
    );
    const edited = await saveBody("skewed", ["b"], root);
    expect(edited.state).toBe("changed");
  });

  it("imports a stage SOP into processes/ with its stage order", async () => {
    const sop = await importDoc(
      { id: "proc-x", title: "Intake", docType: "sop", client: null, process: "intake", stageOrder: 1, publishedAt: "2026-09-29T10:00:00.000Z", blocks: ["Body"] },
      root
    );
    expect(sop.localPath).toBe(path.join("processes", "intake.md"));
    expect(sop.stageOrder).toBe(1);
  });

  it("replaces a local copy with the team's version, discarding local edits and reading 'published'", async () => {
    const mine = await createDoc({ title: "Plan", client: "Givebacks", process: "workshop" }, root);
    await saveBody(mine.id, ["My unpublished edit"], root);

    const replaced = await replaceWithTeam(
      mine.id,
      { title: "Plan v2", docType: "deliverable", publishedAt: "2026-09-29T12:00:00.000Z", blocks: ["Team text"] },
      root
    );
    expect(replaced).toMatchObject({ id: mine.id, title: "Plan v2", docType: "deliverable", state: "published", localPath: mine.localPath });
    expect(replaced.blocks.map((b) => (b.type === "markdown" ? b.content.text : ""))).toEqual(["Team text"]);
    expect(replaced.client).toBe("givebacks");
  });

  it("refuses to save a document that does not exist", async () => {
    await expect(saveBody("nope", ["x"], root)).rejects.toThrow(/No document/);
  });

  it("round-trips the real process docs without changing their bodies", async () => {
    const real = path.join(process.cwd(), "workspace", "processes", "03-workshop.md");
    await write("processes/03-workshop.md", await fs.readFile(real, "utf8"));
    const before = matter(await fs.readFile(path.join(root, "processes/03-workshop.md"), "utf8")).content.trim();
    const doc = (await readById("proc-workshop", root))!;
    await saveBody(doc.id, doc.blocks.map((b) => (b.type === "markdown" ? b.content.text : "")), root);
    const after = matter(await fs.readFile(path.join(root, "processes/03-workshop.md"), "utf8")).content.trim();
    expect(after).toBe(before);
  });
});
