import { describe, expect, it } from "vitest";
import { search, type SearchEntry } from "./rank";

const e = (id: string, title: string, text = ""): SearchEntry => ({ id, title, where: "", text });
const entries = [
  e("a", "Workshop output", "59 named workflows spanning the organisation"),
  e("b", "Assessment", "Value Flow Engine framework. The workshop comes next."),
  e("c", "Intake", "Two passes: a wide net, then a deep dive"),
];

describe("search", () => {
  it("ranks title matches above body matches", () => {
    expect(search(entries, "workshop").map((h) => h.entry.id)).toEqual(["a", "b"]);
  });

  it("requires every word to match somewhere", () => {
    expect(search(entries, "workshop framework").map((h) => h.entry.id)).toEqual(["b"]);
    expect(search(entries, "workshop zebra")).toEqual([]);
  });

  it("is case-insensitive and ignores extra spaces", () => {
    expect(search(entries, "  DEEP   dive ").map((h) => h.entry.id)).toEqual(["c"]);
  });

  it("returns nothing for an empty query", () => {
    expect(search(entries, "   ")).toEqual([]);
  });

  it("gives a snippet around the body match", () => {
    const [hit] = search(entries, "framework");
    expect(hit.snippet).toContain("Value Flow Engine framework");
  });
});
