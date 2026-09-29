import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileStorage, hasSessionFile } from "./session";

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "crisp-session-"));
  file = path.join(dir, "nested", "agent-session.json");
});
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("fileStorage", () => {
  it("writes the session readable only by the owner", async () => {
    await fileStorage(file).setItem("sb-token", "secret");
    const mode = (await fs.stat(file)).mode & 0o777;
    expect(mode).toBe(0o600);
    expect(await hasSessionFile(file)).toBe(true);
  });

  it("always reads the latest value, so a token rotated by another process is picked up", async () => {
    const a = fileStorage(file);
    const b = fileStorage(file);
    await a.setItem("sb-token", "v1");
    await b.setItem("sb-token", "v2"); // another Claude Code session refreshed
    expect(await a.getItem("sb-token")).toBe("v2");
  });

  it("keeps other keys when one changes, and deletes the file when the last is removed", async () => {
    const s = fileStorage(file);
    await s.setItem("sb-token", "t");
    await s.setItem("sb-token-code-verifier", "v");
    await s.removeItem("sb-token-code-verifier");
    expect(await s.getItem("sb-token")).toBe("t");
    await s.removeItem("sb-token");
    expect(await hasSessionFile(file)).toBe(false);
  });

  it("returns null rather than throwing when there is no session", async () => {
    expect(await fileStorage(file).getItem("sb-token")).toBeNull();
  });
});
