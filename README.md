# Crisp

Evercrisp's internal knowledge spine. Documents, SOPs, skills and client work in one place, organised by client and by process, readable by people and by agents.

Status: works locally. Laid out like Notion (being customised). You can create, edit and search documents in a local folder of markdown, and Claude Code can read and write them through the MCP server. Sign-in and publishing are built against a real Supabase project; publishing has not yet been exercised end to end by a signed-in team member. See "What does not work yet" below.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase URL and anon key
npm run dev                  # http://localhost:3100
```

For everyday use, run the production build instead of the dev server:

```bash
npm run build
npm start                    # http://localhost:3100
```

Both listen on `127.0.0.1` only, so nobody else on your network can reach them. With Supabase keys in `.env.local`, every page needs a signed-in team member; without keys, Crisp runs in local-only mode with no sign-in.

Checks (typecheck, lint, 78 tests including the database schema and access rules on in-process Postgres):

```bash
npm run check
```

## Security

- **Every page** needs a signed-in session *and* a `team_members` row (`src/proxy.ts`). A session alone is not enough: the Supabase anon key is public, so anyone could create a Supabase account.
- **Every write** (save, rename, create, publish, take team version) checks the same thing again inside the server action (`src/features/auth/guard.ts`), since server actions can be called by a direct request to any page.
- **The database** refuses reads and writes from non-members with row-level security, whatever the app does.
- **Headers** (`next.config.ts`): content security policy, no framing, no MIME sniffing, strict referrer, permissions policy. HSTS is sent but only takes effect over https.
- **Dependencies**: `npm audit` clean, registry signatures verified. Three dev-only packages run install scripts (esbuild, fsevents, unrs-resolver), all build tooling.
- **Recommended in Supabase:** turn off the Email provider (Authentication → Providers). Crisp only uses Google, and leaving email sign-up on lets strangers create accounts; they cannot see anything, but there is no reason to allow it.

## Deploying

Crisp is local-first: each person runs it on their own machine, drafts live in that machine's `workspace/` folder, and the team shares through Supabase. That works as-is.

**Hosting it (for example on Vercel) does not work yet.** Serverless hosts have no writable, persistent disk, so drafts, saving and new pages would fail. Hosting needs drafts stored somewhere else first (for example per-person rows in Supabase), which is a design decision, not a config change. Until then, `npm start` on each machine is the supported way to run it.

## How it works

**Layout.** Evercrisp's colours and type (from projects.evercrisp.ai), a Notion-style sidebar (Search, Home, Recent, My drafts, Shared), and OpenMetadata-style pages. Home is Explore: search plus Type, Client, Process and Status filters and sort, all in the URL so any view can be shared, with a browse tree and a detail panel on wide screens. Document pages have a header card with the path, title, Publish and properties. Comments and page actions (⋯) are placeholders, marked "Not built yet".

**Local first.** Everything starts as a markdown file in `workspace/` (or wherever `CRISP_WORKSPACE` points). Only you can see local files. Publishing will send a document to the team. Nothing will publish on its own.

**Where documents appear:** everything is in Explore and on Home. My drafts are local documents only you can see; published ones are visible to the team, grouped by client, process stage, and Evercrisp's own.

**Three states**, computed in one place (`src/features/workspace/doc.ts`):

| State | Rule | Shown as |
| --- | --- | --- |
| Local | never published | grey "Draft" pill |
| Published | local copy matches what was published | green "Published" pill |
| Unpublished changes | edited after publishing | amber "Unpublished changes" pill |

**Two routes to every published client document.** It appears under its client and under its process stage. The breadcrumb follows the route you took.

**Editing, Notion-style.** Click a block to edit it as markdown. Enter starts a new block, Shift+Enter a line break, Backspace at the start merges upward, `/` opens the block menu (headings, lists, to-do, quote, code, divider), the handle on hover drags a block, Cmd/Ctrl+Shift+Up/Down moves it. Changes save to the file about a second after you stop typing. The title edits in place. "+ Add new", the sidebar's new-page icon and the table's New create a local page.

**Search.** Cmd/Ctrl+K, or click "Search or ask". Every word must match; titles rank above body text.

**Blocks, not a text body.** A document is an ordered list of typed blocks (`src/features/blocks/types.ts`). Only markdown renders today, but all eight types are declared, and every one serialises to markdown (`to-markdown.ts`) so agents can read mixed documents.

## Sign-in

Google OAuth through Supabase, gated to the team, not to a domain.

- `/login` starts the flow; `hd=evercrisp.ai` narrows Google's own account picker to that domain, but that is a hint, not a boundary, and can be bypassed.
- **The real gate is membership.** `/auth/callback` exchanges the code for a session, then checks `team_members`. No row there: the session is signed straight back out and the visitor lands on `/auth/not-authorized`, which shows the email so they know what to tell an admin. A session for a non-member never reaches the rest of the app.
- `src/proxy.ts` fences every route except `/login` and `/auth/*` behind having a session at all. Without Supabase keys configured, the proxy lets everything through (so the shell can be built and reviewed without a backend); with keys configured, as they are now, it is live.
- Sign out is in the sidebar's workspace menu, bottom left.

**Add someone to the team** (run in the Supabase SQL Editor, after they've attempted to sign in at least once, so their `auth.users` row exists):

```sql
insert into team_members (user_id)
select id from auth.users where email = 'name@evercrisp.ai';
```

Needs, in the Supabase dashboard: Google enabled under Authentication → Providers, with a Google OAuth client's ID and secret, and `http://localhost:3100` (plus the real domain, once deployed) under Authentication → URL Configuration → Redirect URLs.

## Workspace file format

```markdown
---
id: gb-workshop-output        # stable id, used in the URL
title: Workshop output
doc_type: deliverable         # note | sop | skill | deliverable | decision
client: givebacks             # optional
process: workshop             # optional: intake | assessment | workshop | backlog
published_at: 2026-09-28T09:00:00Z   # omit if never published
updated_at: 2026-09-28T11:30:00Z     # omit to use the file's modified time
---

Body in markdown.
```

A process SOP is a `doc_type: sop` with a `process` and no `client`. Those four files define the Processes teamspace and its order (`stage_order`).

## Agents (MCP server)

Claude Code can search, read, create and update Crisp documents through an MCP server that shares the app's own file store. It is registered at user scope (available in every project), with the workspace path pinned. To register it on another machine:

```bash
claude mcp add crisp --scope user -e CRISP_WORKSPACE="/Users/apple/Documents/Claude Code/crisp/workspace" -- npm --prefix "/Users/apple/Documents/Claude Code/crisp" run mcp --silent
```

Tools: `list_documents`, `list_clients`, `search_documents`, `read_document`, `create_document`, `update_document`. Everything an agent writes is local (Private); editing a published document marks it "Unpublished changes". Agents never publish.

**Team documents for agents.** The server reads the team's published documents once it has its own sign-in:

```bash
npm run mcp:login    # opens Google; keeps a session in ~/.crisp/agent-session.json (0600)
npm run mcp:logout   # deletes it
```

Needs `http://localhost:54390/callback` in Supabase → Authentication → URL Configuration → Redirect URLs. Only a team member's session is kept. It is a separate session from the app's (sharing one would sign you out, since Supabase rotates tokens), and row-level security applies to it exactly as to you. Without it, every tool still works on local documents and says team documents are not included. Editing a teammate's document through an agent saves a local copy first; agents never publish.

To exercise every tool against a throwaway copy of the workspace:

```bash
cp -R workspace /tmp/crisp-ws && CRISP_WORKSPACE=/tmp/crisp-ws npx tsx mcp/smoke-test.ts
```

## Publishing

The top bar's **Share** button, on a document page only, publishes that page to the team. Two clicks: the first arms it ("Share with team?"), the second within four seconds publishes. `publishDoc` in `src/app/actions.ts`:

1. Upserts the client by slug (created the first time one of its pages is shared) and looks up the process stage.
2. Upserts the `documents` row (same text id as the local file) with the markdown body, then replaces its `blocks`.
3. Only after every write succeeds, sets `published_at` in the local file, so it reads "Published". It never touches `updated_at`, or it would immediately read "Unpublished changes".

Row-level security is the real permission check: a session outside `team_members` has every write refused by the database.

**Reading it back.** Every page reads through `loadWorkspace()` (`src/features/workspace/local.ts`), which merges local files with the team's published documents (`team-fetch.ts`, as the signed-in user). A local copy always wins. A teammate's document with no local copy shows "From the team" in the top bar; the first edit saves a local copy with the same id, which then reads "Unpublished changes" and republishes with Share. If the database is unreachable, the app shows local documents only.

**Newer versions.** If a teammate published after the version your copy is based on, the page shows a notice with "Use the team's version" (two clicks; it discards your unpublished edits). Share still works, but asks "Overwrite team's version?" first. The check is repeated inside the database write itself (the update only matches if the team's `published_at` is still what was just read), so two people publishing at nearly the same moment cannot overwrite each other unknowingly.

## Database

`supabase/migrations/` holds the schema for the shared layer (clients, processes, engagements, documents, blocks, decisions, team membership), with row-level security on every table: only people in `team_members` see anything. `supabase/seed.sql` adds the four process stages. `supabase/schema.test.ts` runs both against in-process Postgres and checks the access rules. Not yet applied to a hosted project.

## Layout

```
src/
  app/
    (app)/             everything behind sign-in: layout.tsx (the shell), / and /explore (Explore), /d/[id]
    login/             sign-in page
    auth/              callback, signout, not-authorized route handlers and page
    layout.tsx          true root: html/head/body only, no sidebar, no workspace read
    actions.ts          server actions (writes)
  features/
    auth/              the Google sign-in button
    blocks/            block types, renderer registry, markdown serialisation
    explore/           Explore filters (pure, tested) and its panes
    editor/            block editor, slash menu, title editor
    search/            search ranking and the Cmd+K dialog
    shell/             sidebar, drawer, menus, status pills, theme
    workspace/         local folder loader, publish state, sidebar tree, links
  content/site.ts      all user-facing copy
  lib/supabase/        clients
  proxy.ts             auth fence (Next 16 renamed middleware to proxy)
mcp/                   MCP server and its smoke test
supabase/              schema migration, seed, schema tests
workspace/             local documents (the four process SOPs plus seed docs)
```

`(app)` is a route group: it adds no URL segment, but its `layout.tsx` (the sidebar, search dialog, workspace read) wraps only what is inside it. `/login` and `/auth/*` sit outside it, so a signed-out visitor never renders the sidebar and never sees a document title.

Design tokens live in `src/app/globals.css`. Measurements and known gaps are in `vault/Design & Style.md`.

## What does not work yet

- **Conflicts are detected, not merged.** When a teammate publishes a newer version, you choose: take theirs (discarding your unpublished edits) or overwrite theirs with yours. There is no line-by-line merge.
- **Sign-in needs two things from the Supabase dashboard first**: Google enabled as a provider, and at least one person in `team_members` (see "Sign-in" above). Until then, everyone who tries gets a clean "not on the team" page, not an error.
- **Editing is markdown blocks only.** No image, table, video, embed or chart blocks; they are listed as "coming soon" in the `/` menu. Properties (type, client, process) are not editable in the app yet; edit the file's frontmatter.
- **No filters, sort or other database views**; those toolbar icons are inert.
- **Last write wins.** Editing the same file in Crisp and another editor at once will overwrite one with the other.
- **Light theme unmeasured**, and several of Notion's own muted colours fall below WCAG AA contrast. Both are listed in `vault/Design & Style.md`.
- **Seed content.** The three Givebacks documents are labelled placeholders, not real deliverables. The four process SOPs are real, copied verbatim from `evercrisp-process-docs`.

The build order and scope are in `vault/Roadmap.md`.
