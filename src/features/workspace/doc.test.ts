import { describe, expect, it } from "vitest";
import { docState } from "./doc";

describe("docState", () => {
  it("is local when never published", () => {
    expect(docState(null, "2026-09-28T13:10:00Z")).toBe("local");
  });

  it("is published when the local copy is the published copy", () => {
    expect(docState("2026-09-20T15:00:00Z", "2026-09-20T15:00:00Z")).toBe("published");
  });

  it("is changed when edited locally after publishing", () => {
    expect(docState("2026-09-28T09:00:00Z", "2026-09-28T11:30:00Z")).toBe("changed");
  });

  it("treats the same instant in different ISO spellings as unchanged", () => {
    // gray-matter hands back Dates, which serialise with milliseconds.
    // A naive string compare would call this "changed".
    expect(docState("2026-09-28T09:00:00Z", "2026-09-28T09:00:00.000Z")).toBe("published");
  });
});
