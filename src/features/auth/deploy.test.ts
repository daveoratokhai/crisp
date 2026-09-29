import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const ORIGINAL_VERCEL = process.env.VERCEL;
afterEach(() => {
  if (ORIGINAL_VERCEL === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = ORIGINAL_VERCEL;
});

describe("isReadOnlyHost", () => {
  it("is true only when Vercel's own env var is exactly '1'", async () => {
    const { isReadOnlyHost } = await import("@/lib/deploy");

    delete process.env.VERCEL;
    expect(isReadOnlyHost()).toBe(false);

    process.env.VERCEL = "1";
    expect(isReadOnlyHost()).toBe(true);

    process.env.VERCEL = "true"; // some hosts set truthy strings other than "1"
    expect(isReadOnlyHost()).toBe(false);
  });
});

describe("assertWritable", () => {
  it("throws ReadOnlyHostError only when isReadOnlyHost() is true", async () => {
    const { assertWritable, ReadOnlyHostError } = await import("./guard");

    delete process.env.VERCEL;
    expect(() => assertWritable()).not.toThrow();

    process.env.VERCEL = "1";
    expect(() => assertWritable()).toThrow(ReadOnlyHostError);
  });
});
