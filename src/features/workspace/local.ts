import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import type { Doc } from "./doc";
import { readAll } from "./store";
import { mergeDocs } from "./team";
import { loadTeamDocs } from "./team-fetch";

export { workspaceRoot } from "./store";

/**
 * Every document the app shows: local files on this machine, plus whatever the
 * team has published that has no local copy here. Disk logic lives in
 * store.ts (shared with the MCP server), the database read in team-fetch.ts.
 *
 * Wrapped in React's cache so one request reads the disk and queries the
 * database once, however many components ask (the layout, the page and its
 * metadata all do).
 */
export const loadWorkspace = cache(async (): Promise<Doc[]> => {
  // The workspace is read from disk, which Next cannot see changing. Without
  // this, any page using it is prerendered at build time and a newly added
  // file never appears in production until the next rebuild.
  await connection();
  const [local, team] = await Promise.all([readAll(), loadTeamDocs()]);
  return mergeDocs(local, team);
});
