/**
 * The MCP server's own Supabase session: the agent signs in as you, once, via
 * `npm run mcp:login`, and row-level security then applies to it exactly as
 * it does to you in the app.
 *
 * Why not reuse the browser's session: Supabase rotates refresh tokens, so two
 * holders of one session would sign each other out. Why not a service key: it
 * bypasses every access rule. So the agent has a session of its own.
 *
 * Stored in ~/.crisp/agent-session.json, outside the repo, readable only by
 * you (0600). Anyone who can read that file can read Crisp as you; delete it
 * with `npm run mcp:logout`.
 *
 * Several Claude Code sessions may run this server at once, and each refresh
 * rotates the token. So the file is re-read on every access instead of being
 * cached, and whichever process refreshed last is the one everyone reads next.
 */
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SESSION_DIR = path.join(os.homedir(), ".crisp");
export const SESSION_FILE = path.join(SESSION_DIR, "agent-session.json");

/** Supabase URL and anon key from crisp/.env.local; the MCP server runs outside Next, which normally loads it. */
export function supabaseEnv(): { url: string; anonKey: string } | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      process.loadEnvFile(path.join(__dirname, "..", ".env.local"));
    } catch {
      // No .env.local: team documents are simply unavailable.
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

async function readStore(file: string): Promise<Record<string, string>> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return {};
  }
}

async function writeStore(file: string, store: Record<string, string>) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(store), { mode: 0o600 });
  await fs.rename(tmp, file); // atomic, so a concurrent reader never sees half a file
}

/** A supabase-js storage adapter over one JSON file, read fresh on every call. */
export function fileStorage(file = SESSION_FILE) {
  return {
    async getItem(key: string) {
      return (await readStore(file))[key] ?? null;
    },
    async setItem(key: string, value: string) {
      const store = await readStore(file);
      store[key] = value;
      await writeStore(file, store);
    },
    async removeItem(key: string) {
      const store = await readStore(file);
      delete store[key];
      if (Object.keys(store).length === 0) await fs.rm(file, { force: true });
      else await writeStore(file, store);
    },
  };
}

/** A fresh client on the stored session. No background refresh timer: it refreshes when a call needs it. */
export function agentClient(env: { url: string; anonKey: string }, file = SESSION_FILE): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    auth: { flowType: "pkce", storage: fileStorage(file), persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function hasSessionFile(file = SESSION_FILE): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
