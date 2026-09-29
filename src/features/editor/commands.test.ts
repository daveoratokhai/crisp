import { describe, expect, it } from "vitest";
import { copy } from "@/content/site";
import { COMMANDS, filterCommands, isCodeBlock } from "./commands";

const labels = copy.editor.commands;

describe("filterCommands", () => {
  it("lists every command, built ones first, when nothing is typed", () => {
    const all = filterCommands("", labels);
    expect(all).toHaveLength(COMMANDS.length);
    const firstUnbuilt = all.findIndex((c) => !c.apply);
    expect(all.slice(firstUnbuilt).every((c) => !c.apply)).toBe(true);
  });

  it("matches labels and keywords, case-insensitively", () => {
    expect(filterCommands("Head", labels).map((c) => c.key)).toEqual(["h1", "h2", "h3"]);
    expect(filterCommands("checkbox", labels).map((c) => c.key)).toEqual(["todo"]);
    expect(filterCommands("zzz", labels)).toEqual([]);
  });
});

describe("commands", () => {
  it("turn a block into the matching markdown", () => {
    const get = (k: string) => COMMANDS.find((c) => c.key === k)!.apply!();
    expect(get("h2")).toEqual({ text: "## ", caret: 3 });
    expect(get("code")).toEqual({ text: "```\n\n```", caret: 4 });
    expect(get("divider")).toMatchObject({ text: "---", thenNewBlock: true });
  });
});

describe("isCodeBlock", () => {
  it("recognises fenced blocks only", () => {
    expect(isCodeBlock("```ts\nconst a = 1\n```")).toBe(true);
    expect(isCodeBlock("~~~\nx")).toBe(true);
    expect(isCodeBlock("Some `inline` code")).toBe(false);
  });
});
