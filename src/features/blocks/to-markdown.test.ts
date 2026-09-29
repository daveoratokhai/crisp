import { describe, expect, it } from "vitest";
import { blockToMarkdown, documentToMarkdown } from "./to-markdown";
import type { Block } from "./types";

describe("blockToMarkdown", () => {
  it("passes markdown text through unchanged", () => {
    const block: Block = { id: "a", type: "markdown", content: { text: "## Goals\n\n- ship" } };
    expect(blockToMarkdown(block)).toBe("## Goals\n\n- ship");
  });

  it("renders an image with its caption", () => {
    const block: Block = {
      id: "b",
      type: "image",
      content: { alt: "Flow diagram", caption: "Current state" },
      storagePath: "docs/flow.png",
    };
    expect(blockToMarkdown(block)).toBe("![Flow diagram](docs/flow.png)\n*Current state*");
  });

  it("escapes pipes inside table cells so the table survives", () => {
    const block: Block = {
      id: "t",
      type: "table",
      content: {
        columns: [{ key: "q", label: "Question", kind: "text" }],
        rows: [{ q: "A | B?" }],
      },
    };
    expect(blockToMarkdown(block)).toBe("| Question |\n| --- |\n| A \\| B? |");
  });

  it("resolves a chart to the table it renders from", () => {
    const table: Block = {
      id: "t1",
      type: "table",
      content: {
        columns: [
          { key: "month", label: "Month", kind: "text" },
          { key: "hours", label: "Hours", kind: "number" },
        ],
        rows: [{ month: "Sep", hours: 40 }],
      },
    };
    const chart: Block = {
      id: "c1",
      type: "chart",
      content: { tableBlockId: "t1", kind: "bar", x: "month", y: "hours" },
    };
    const out = blockToMarkdown(chart, [table, chart]);
    expect(out).toContain("*bar chart of hours by month*");
    expect(out).toContain("| Sep | 40 |");
  });

  it("says so plainly when a chart's source table is gone", () => {
    const chart: Block = {
      id: "c1",
      type: "chart",
      content: { tableBlockId: "deleted", kind: "line", x: "a", y: "b" },
    };
    expect(blockToMarkdown(chart, [chart])).toContain("(source table missing)");
  });
});

describe("documentToMarkdown", () => {
  it("joins a mixed document in block order under its title", () => {
    const blocks: Block[] = [
      { id: "1", type: "markdown", content: { text: "Intro." } },
      { id: "2", type: "embed", content: { url: "https://loom.com/x", title: "Walkthrough" } },
    ];
    expect(documentToMarkdown("Kickoff", blocks)).toBe(
      "# Kickoff\n\nIntro.\n\n[Walkthrough](https://loom.com/x)"
    );
  });
});
