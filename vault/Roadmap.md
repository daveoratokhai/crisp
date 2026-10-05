# Roadmap

✅ Done · 🔄 In progress · ⬜ Not started · ❌ Decided against

## Week 1: the spine

- ✅ Scaffold: Next 16.3.4, React 19.2, Tailwind 4, `@supabase/ssr` 0.7, vitest 5. 0 vulnerabilities.
- ✅ Schema and migrations (`supabase/migrations/20260928000001_initial_schema.sql`, `supabase/seed.sql`). RLS on every table via `team_members`. Tested on in-process Postgres (`supabase/schema.test.ts`); not yet applied to a hosted project.
- ✅ Local workspace layer. Read and write in `src/features/workspace/store.ts`, shared by app and MCP server.
- ✅ Design tokens and shell. Now a Notion replica (2026-09-28): dark measured, light unmeasured.
- ✅ Reader. Notion sidebar (Recents, Private, Teamspaces), path-aware breadcrumbs, block registry, 404 page.
- ✅ Home as a Notion table database of all documents; document pages with property rows.
- ✅ Sidebar collapse, expandable page rows, workspace menu with appearance setting, copy link.
- ✅ Notion features removed, Crisp vocabulary in (2026-09-29).
- ✅ Redesigned after OpenMetadata (2026-09-29): rail, top bar, Explore with working filters/sort/search, entity document page, dashboard Home. Palette measured AA.
- ✅ Production pass (2026-09-29): auth on every write and page, security headers, localhost binding, error page, dark mode toggle, dead code cleared.
- ✅ Hosting (Vercel, 2026-10-05): live read-only at crisp-nu.vercel.app. ⬜ Editable hosting still needs drafts moved from disk into Supabase.
- ✅ Comments (2026-10-05): highlight published text to comment on it (`src/features/doc/doc-tabs.tsx`, `comments` table). ⬜ page actions (⋯) still inert.
- ⬜ Measure Notion's light theme.
- ✅ Block editor (`src/features/editor/`): click to edit, Enter/Shift+Enter, Backspace merge, arrows, `/` menu, drag and Mod+Shift+Arrow reorder, autosave, editable title.
- ✅ Sign-in: Google OAuth via Supabase, gated on a `team_members` row (`src/app/auth/`, `src/features/auth/`). ⬜ Dave: enable Google in the Supabase dashboard and add the first member (README "Sign-in" section has both).
- ✅ Publish, via the top bar's Share button (two-click confirm). `publishDoc` in `src/app/actions.ts` upserts client, document and blocks, then `markPublished` in the store. ⬜ Not yet exercised by a signed-in member (needs Dave signed in).
- ✅ Read shared documents (2026-09-29): `loadWorkspace()` merges local files with published rows (`team.ts`, `team-fetch.ts`); local copy wins; editing a team doc forks a local copy with the same id. Query validated against the live schema. ⬜ Not yet seen with real published data (needs Dave signed in).
- ✅ Conflicts (2026-09-29): newer-version notice with "Use the team's version"; Share asks before overwriting; conditional update on `published_at` blocks races. ⬜ No line-level merge.
- ✅ MCP reads team documents via its own session (`npm run mcp:login`, `mcp/session.ts`). ⬜ Dave: add `http://localhost:54390/callback` to Supabase redirect URLs and run the login.
- 🔄 Wire the inert Notion controls as features arrive. Done: search box, New, New page, Add new, new-page icon. Left: filter, sort, table search, inbox, chat, meetings, calendar, agents, page controls, favourite, more.

## Week 2: agents, assets, proof

- ✅ MCP server `mcp/server.ts` (stdio, SDK 1.30): list_documents, list_clients, search_documents, read_document, create_document, update_document, **publish_document** (2026-10-05, Dave's explicit opt-in). Verified over the real protocol by `mcp/smoke-test.ts` (publish_document exercised manually against the live project, not yet in the smoke test script). ⬜ record_decision waits for the database.
- ✅ `⌘K` search (local, in the browser). The database has a `tsvector` column ready for shared search.
- ⬜ Image and file blocks on Supabase Storage
- 🔄 Seed and migrate. Four process SOPs copied verbatim. Givebacks docs are labelled placeholders.
- ✅ One agent end to end. Registered at user scope (2026-09-29, `claude mcp get crisp` shows Connected). A fresh headless Claude Code session read the four SOPs through it and wrote `Evercrisp methodology at a glance` (`internal/evercrisp-methodology-at-a-glance.md`) back, checked against the sources.

## Week 3: database views

- 🔄 Filtered views: done in Explore (URL-based, linkable). ⬜ Saved views per person.
- ⬜ Board view by engagement phase

## Phase 2

- ⬜ Opportunity assessment engine
- ⬜ Workshop-in-a-box
- ⬜ Design phase generator (needs a design process doc first; none exists)
- ⬜ Table, video, gif, embed, chart block types

## Cut order if time runs short

1. Drag to reorder
2. Slash menu polish
3. Never the block editor itself: without it Crisp is a markdown viewer

## Success test (end of week 2)

1. A real engagement's docs, decisions and deliverables live in Crisp, not Slack
2. An agent read from Crisp, worked, and wrote back with no file-shuffling
3. The key existing docs are migrated
4. Someone other than Dave opens it unprompted
