import { describe, expect, it } from "vitest";
import { joinMarkdown, splitMarkdown } from "./split";

describe("splitMarkdown", () => {
  it("splits on blank lines", () => {
    expect(splitMarkdown("# Title\n\nFirst para\nstill first\n\n- a\n- b")).toEqual([
      "# Title",
      "First para\nstill first",
      "- a\n- b",
    ]);
  });

  it("keeps a code fence with blank lines inside as one block", () => {
    const body = "Intro\n\n```ts\nconst a = 1;\n\nconst b = 2;\n```\n\nAfter";
    expect(splitMarkdown(body)).toEqual(["Intro", "```ts\nconst a = 1;\n\nconst b = 2;\n```", "After"]);
  });

  it("ignores runs of blank lines and Windows line endings", () => {
    expect(splitMarkdown("a\r\n\r\n\r\n\r\nb\r\n")).toEqual(["a", "b"]);
  });

  it("returns no blocks for an empty body", () => {
    expect(splitMarkdown("   \n\n ")).toEqual([]);
  });
});

describe("joinMarkdown", () => {
  it("round-trips a normal document unchanged", () => {
    const body = "## Goals\n\n- ship\n- learn\n\n> quote\n\n| a | b |\n| --- | --- |\n| 1 | 2 |";
    expect(joinMarkdown(splitMarkdown(body))).toBe(body);
  });

  it("drops empty blocks, so a blank new block is never written to disk", () => {
    expect(joinMarkdown(["One", "", "  ", "Two"])).toBe("One\n\nTwo");
  });
});
