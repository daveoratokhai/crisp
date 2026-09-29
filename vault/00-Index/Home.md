# Crisp

Evercrisp's internal knowledge spine. Notion-like, local first, agent-readable.

- [[Roadmap]] · build order and status
- [[Technical Architecture]] · stack, file paths, gotchas
- [[Design & Style]] · tokens, layout, component patterns

## Why it exists

Ben's todo, 2026-09-28: turn Evercrisp's manual processes (assessment, workshops, design) into repeatable systems. The first need is one visible home for documents, SOPs, skills and client work. Today they are spread across ~40 project folders, Slack and Gmail. The assessment engine, workshop kit and design generator are built on top of this later.

Not a SaaS-replacement play: the stack is Slack, Gmail, Sheets, Artifacts. The leak is lost time and scattered work, not subscription spend.

## Why build instead of Notion

1. Agents read and write it through an MCP server.
2. Every block serialises to markdown, so agents read mixed documents coherently.
3. The schema is the methodology: Client, Engagement, Process stage.

## Decisions

| Date | Decision |
| --- | --- |
| 2026-09-28 | Build the knowledge spine first; assessment engine etc. are phase 2 |
| 2026-09-28 | Name: Crisp |
| 2026-09-28 | Next 16 + Supabase (house stack). Convex rejected: unused anywhere here |
| 2026-09-28 | Local first: files canonical for drafts, DB canonical for published, publish is an explicit one-way gate |
| 2026-09-28 | Documents are ordered typed blocks, not a text body. 8 types declared, markdown only for now |
| 2026-09-28 | Sidebar shows Clients and Processes as two parallel trees over the same docs (no toggle) |
| 2026-09-28 | Visual: Evercrisp palette, app-scale type, light + dark from day one |
| 2026-09-28 | Brand orange split into `--orange` (marks) and `--orange-ink` (text): `#e8791d` fails AA |
| 2026-09-28 | Engagement phases follow the real methodology: intake, assessment, workshop, backlog, implementation |
| 2026-09-28 | Nothing from evercrisp-mastermind is used or referenced |
| 2026-09-28 | Process headers link to their SOP directly; no repeated "How we run it" child |
| 2026-09-28 | **Visual switched to a Notion replica**, to be customised later (Dave). Supersedes the Evercrisp palette, which is parked in [[Design & Style]] |
| 2026-09-28 | Notion's sections carry Crisp's meaning: Private = local docs; Teamspaces = client teamspaces, Processes, Evercrisp; Share = publish; Home = all documents as a table |
| 2026-09-28 | Controls copied from Notion with no feature yet are inert with a "Not built yet" tooltip. "Notion apps" and the AI corner button omitted |
| 2026-09-28 | Icons: Lucide (open source), not Notion's proprietary set |
| 2026-09-28 | Editing works on local files: blocks are markdown paragraphs; the file stays plain markdown so any editor still works |
| 2026-09-28 | MCP server shares the app's store; agents write local only and never publish |
| 2026-09-28 | Schema: document ids are text (same as the local file's id), so publish is an upsert; search runs over a stored markdown copy |
| 2026-09-28 | **First departure from Notion:** document pages centre the title and show properties as one centred row of label-over-value cells, replacing Notion's left two-column list (Dave) |
| 2026-09-29 | Real Supabase project created (`tpynhxgwabwcrfymwfwn`), migration and seed applied. Keys in `.env.local` |
| 2026-09-29 | Sign-in: Google OAuth via Supabase. `hd=evercrisp.ai` narrows Google's picker but is not enforced; the real gate is a `team_members` row, checked in `/auth/callback`. No row: signed back out, sent to `/auth/not-authorized` |
| 2026-09-29 | Shell (sidebar, search) moved into `src/app/(app)/layout.tsx`, a route group. The root layout is html/head/body only. Found the hard way: the shell in the root layout meant a signed-out visitor saw the sidebar, and real document titles, before signing in |
| 2026-09-29 | Dave is building on his own personal Supabase project and Google Cloud project, not Evercrisp's org. Deliberate for now; migrate later (see open questions) |
| 2026-09-29 | Publishing is a two-click Share on document pages only. Local file is marked published only after every database write succeeds; `updated_at` untouched so it reads Published |
| 2026-09-29 | Crisp MCP server registered at user scope with the workspace path pinned, so any project's Claude Code session can use it |
| 2026-09-29 | Team documents merge into every view; local copy wins; editing a teammate's document silently forks a local copy with the same id (no separate copy button) |
| 2026-09-29 | **Notion cruft removed and vocabulary replaced** (Dave): no inbox, chat, meetings, calendar, agents, help, apps, favourites, page icon/cover, automations, AI autofill, Add property, New dropdown. Kept as not-built placeholders: filter, sort, table search, ⋯ page actions, comments. Words: Recent, My drafts, Shared, Draft, Publish (was Recents, Private, Teamspaces, Private, Share). Layout geometry and palette unchanged for now |
| 2026-09-29 | **Production pass**: every server action and the proxy require a `team_members` row; security headers; scripts bound to 127.0.0.1; error page; one-click dark mode toggle in the sidebar. Hosting on Vercel needs drafts moved off the local disk first (open question) |
| 2026-09-29 | **Second pass** (Dave): keep OpenMetadata's Explore and document layouts only; Notion-style sidebar back; Evercrisp's palette and Google Sans from projects.evercrisp.ai; Home renders Explore. Rail, top bar and dashboard set aside |
| 2026-09-29 | **Look redesigned after OpenMetadata** (Dave): rail + top bar + Explore (filters, browse, cards, detail) + entity-style document page + dashboard Home. Recreated from screenshots, not its code. Filter, sort and search are now real. Replaces the centred title and properties row from 2026-09-28 |
| 2026-09-29 | Conflicts: detect and let the person choose (take theirs, or overwrite with a prompt); no merging. Race-safe via a conditional update on `published_at` |
| 2026-09-29 | Agents get their own Supabase session via `mcp:login`, not the browser's and never a service key. RLS applies to the agent exactly as to the person |

## Open questions

- ⬜ For Ben: is Crisp internal only, or client-reachable? Decides whether sharing and external auth exist.
- ⬜ For Ben: which live engagement is the test case?
- ⬜ For Ben: internal tool, or future product? Decides how far to generalise the schema.
- ⬜ For Ben: the "design phase" in the todo has no process doc in `evercrisp-process-docs`. A methodology gap, not only a tooling one.
- ⬜ For Dave: enable Google as a provider in the Supabase dashboard (Authentication → Providers) and add the redirect URL. Tested 2026-09-29: Supabase correctly returns "provider is not enabled" until this is done.
- ⬜ For Dave: once Google is enabled, add yourself to `team_members` after your first sign-in attempt (SQL in README's "Sign-in" section). Nobody can get in until at least one row exists.
- ⬜ For Dave: add `http://localhost:54390/callback` to Supabase redirect URLs, then run `npm run mcp:login` in `crisp/` so agents can read team documents.
- ⬜ For Dave: turn off the Email provider in Supabase (Authentication → Providers). Only Google is used.
- ⬜ For Dave and Ben: host Crisp (Vercel) or keep it local-first per machine? Hosting needs drafts stored in Supabase, not on disk.
- ⬜ For Dave: switch Notion to Light for a minute so the light theme can be measured (currently unmeasured).
- ⬜ For Dave: when customising, which of Notion's failing contrast pairs to fix (see [[Design & Style]]).
- ⬜ For Dave: this Supabase project and Google Cloud project are personal, to be migrated to Evercrisp's own accounts eventually. When that happens: transfer or recreate the Supabase project (migrations are files, easy to reapply), add the production domain to Supabase's redirect URL allowlist (the Google OAuth client's own redirect URI never changes, since it always points at Supabase, not at Crisp's own domain), and swap `.env.local` / the deploy's env vars to the new project's keys.
- ✅ Two-axes navigation: resolved as parallel trees (2026-09-28).
- ✅ Supabase project URL and anon key: provided 2026-09-29.
