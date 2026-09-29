/**
 * Runs the real migration and seed against Postgres (PGlite, in-process) and
 * checks the row-level security rules. Supabase's auth pieces are stubbed:
 * auth.users, auth.uid() reading the JWT subject, the anon/authenticated
 * roles and the grants Supabase gives them by default.
 *
 * This proves the SQL is valid Postgres and the policies behave. It does not
 * prove anything about a hosted Supabase project; test there once one exists.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MEMBER = "11111111-1111-1111-1111-111111111111";
const OUTSIDER = "22222222-2222-2222-2222-222222222222";

let db: PGlite;

async function as(user: string | null, sql: string, params: unknown[] = []) {
  await db.exec("reset role");
  if (user) {
    await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
  } else {
    await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`);
  }
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("reset role");
  }
}

beforeAll(async () => {
  db = new PGlite();
  // Supabase stand-ins.
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);

  const dir = path.join(__dirname, "migrations");
  for (const file of (await fs.readdir(dir)).sort()) {
    await db.exec(await fs.readFile(path.join(dir, file), "utf8"));
  }
  await db.exec(await fs.readFile(path.join(__dirname, "seed.sql"), "utf8"));

  // Supabase's default privileges; RLS then decides which rows.
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    insert into auth.users (id) values ('${MEMBER}'), ('${OUTSIDER}');
    insert into public.team_members (user_id) values ('${MEMBER}');
    insert into public.clients (slug, name) values ('givebacks', 'Givebacks');
  `);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("schema", () => {
  it("seeds the four process stages in order", async () => {
    const { rows } = await db.query<{ slug: string }>("select slug from public.processes order by stage_order");
    expect(rows.map((r) => r.slug)).toEqual(["intake", "assessment", "workshop", "backlog"]);
  });

  it("rejects a phase outside the methodology", async () => {
    await expect(
      db.query("insert into public.engagements (client_id, name, phase) select id, 'X', 'design' from public.clients")
    ).rejects.toThrow(/check/);
  });

  it("indexes title and body for search, title weighted higher", async () => {
    await db.exec(`insert into public.documents (id, title, body_markdown) values
      ('d1', 'Workshop output', 'Fifty nine workflows'),
      ('d2', 'Readout', 'Notes from the workshop')`);
    const { rows } = await db.query<{ id: string }>(
      "select id from public.documents where search @@ websearch_to_tsquery('english', 'workshop') order by ts_rank(search, websearch_to_tsquery('english', 'workshop')) desc"
    );
    expect(rows.map((r) => r.id)).toEqual(["d1", "d2"]);
  });

  it("removes a document's blocks with it", async () => {
    await db.exec(`insert into public.documents (id, title) values ('d3', 'Temp');
      insert into public.blocks (document_id, position, block_type, content) values ('d3', 0, 'markdown', '{"text":"hi"}');
      delete from public.documents where id = 'd3';`);
    const { rows } = await db.query("select 1 from public.blocks where document_id = 'd3'");
    expect(rows).toHaveLength(0);
  });
});

describe("row-level security", () => {
  it("lets a team member read shared documents", async () => {
    const { rows } = await as(MEMBER, "select id from public.documents order by id");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("shows a signed-in non-member nothing, in every table", async () => {
    for (const table of ["team_members", "clients", "processes", "engagements", "documents", "blocks", "decisions"]) {
      const { rows } = await as(OUTSIDER, `select * from public.${table}`);
      expect(rows, table).toHaveLength(0);
    }
  });

  it("shows an anonymous visitor nothing", async () => {
    const { rows } = await as(null, "select * from public.documents");
    expect(rows).toHaveLength(0);
  });

  it("lets a member publish, and refuses a non-member", async () => {
    await as(MEMBER, "insert into public.documents (id, title) values ('pub-1', 'Published by a member')");
    await expect(as(OUTSIDER, "insert into public.documents (id, title) values ('pub-2', 'Sneaky')")).rejects.toThrow(
      /row-level security/
    );
  });

  it("does not let anyone add themselves to the team from the app", async () => {
    await expect(as(OUTSIDER, `insert into public.team_members (user_id) values ('${OUTSIDER}')`)).rejects.toThrow(
      /row-level security/
    );
    await expect(as(MEMBER, `insert into public.team_members (user_id) values ('${OUTSIDER}')`)).rejects.toThrow(
      /row-level security/
    );
  });
});
