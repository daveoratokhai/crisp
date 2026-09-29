# Handoff

## Goal
Build Crisp, Evercrisp's internal knowledge spine: a Notion-like, local-first app where documents, SOPs, skills and client work live, organised by client and by process, readable by agents through an MCP server. Origin: Ben's 2026-09-28 todo to "Evercrispify Evercrisp". Full plan: `/Users/apple/.claude/plans/users-apple-downloads-transcript-2026-0-goofy-brooks.md`. Vault: `vault/00-Index/Home.md`.

## Status
Works locally, with sign-in and publishing built against a real Supabase project. The MCP server is registered in Claude Code and proven with a real task. Publishing, reading team documents back, conflict handling and agent access to team documents are all built; neither has been seen working with real data, because nobody has signed in yet (Dave needs to finish Google setup). The team query is validated against the live schema.

## Completed
- Scaffold, Notion-replica shell (dark measured, light unmeasured), document pages with centred title and property row (first departure from Notion).
- **Store** (`src/features/workspace/store.ts`): read, save body, rename, create. Plain Node, shared by app and MCP server. Tested against temp dirs, including a real SOP round-tripping unchanged.
- **Block editor** (`src/features/editor/`): click to edit, Enter / Shift+Enter, Backspace merge, arrows, `/` menu (headings, lists, to-do, quote, code, divider; rich types "coming soon"), drag and Mod+Shift+Arrow reorder, autosave (~1s, immediate on structural changes, retry on failure), editable title.
- **New pages** from the sidebar icon, both "Add new" rows, the table's New and New page row. Created local, so they land in Private.
- **Cmd+K search** over titles and bodies, with snippets and recents.
- **MCP server** (`mcp/server.ts`): list_documents, list_clients, search_documents, read_document, create_document, update_document. Agents write local only.
- **Schema, applied**: `supabase/migrations/20260928000001_initial_schema.sql` and `seed.sql` ran against the real project (`tpynhxgwabwcrfymwfwn`). Keys in `.env.local`.
- **Sign-in** (`src/app/login/`, `src/app/auth/`, `src/features/auth/`): Google OAuth through Supabase. `/auth/callback` exchanges the code, then checks `team_members`; no row, signed back out to `/auth/not-authorized`. Sign out is in the sidebar's workspace menu.
- **Publishing** (`publishDoc` in `src/app/actions.ts`, `src/features/shell/share-button.tsx`): two-click Share on document pages; upserts client, document, blocks; marks the local file published only after all writes succeed. `markPublished` in the store leaves `updated_at` alone (tested).
- **MCP registered** at user scope with `CRISP_WORKSPACE` pinned. A fresh headless `claude -p` session used it to read the four SOPs and write `internal/evercrisp-methodology-at-a-glance.md`; content checked against the sources.
- **Production pass** (2026-09-29): `requireMember()` in every server action, membership check in the proxy, security headers in `next.config.ts`, scripts on 127.0.0.1, `(app)/error.tsx`, sidebar dark mode toggle, dead copy removed, 78 tests. Hosting blocked on drafts living on local disk.
- **Second pass** (2026-09-29): Evercrisp palette + Google Sans from projects.evercrisp.ai, Notion-style sidebar restored, Home renders Explore; OpenMetadata Explore and document layouts kept; rail, top bar and dashboard moved to the session scratchpad.
- **Redesigned after OpenMetadata** (2026-09-29, first pass): rail, top bar, `/explore` (filters, browse tree, cards, detail panel; all URL-based), entity-style document page, dashboard Home. New tokens, AA in both themes. Old shell files moved to the session scratchpad.
- **Notion cruft removed** (2026-09-29): dead Notion features gone, Crisp vocabulary (Recent, My drafts, Shared, Draft, Publish). Placeholders kept for filter, sort, table search, ⋯, comments. Dave has signed in and published a page for real.
- **Shell moved to a route group**, `src/app/(app)/layout.tsx`, so `/login` and `/auth/*` render with no sidebar. The root layout is now html/head/body only.

## Files changed
- `crisp/` (new project). This session: `.env.local` (keys, git-ignored); `src/app/login/`, `src/app/auth/*`, `src/features/auth/*` (new); `src/app/layout.tsx` (stripped to root shell), `src/app/(app)/` (new group, holds the moved `page.tsx`, `d/[id]/page.tsx`, `not-found.tsx`, plus the new `layout.tsx` with the shell logic); `src/features/shell/{sidebar,workspace-menu}.tsx` (userEmail, sign-out row); `src/content/site.ts` (auth copy).
- `/Users/apple/Documents/Claude Code/.claude/launch.json`: `crisp` config on port 3100. Other configs untouched.

## Decisions
- House stack (Next + Supabase); Convex rejected.
- Files canonical for drafts, DB canonical for published, explicit publish gate.
- Blocks, not a text body.
- Visual: Notion replica for now. The Evercrisp palette is parked in `vault/Design & Style.md`.
- Controls copied from Notion without a feature are inert and say so; Notion's own product links ("Notion apps", AI button) are omitted.
- Icons are Lucide, not Notion's proprietary set.
- Engagement phases follow the real methodology: intake, assessment, workshop, backlog, implementation.
- Nothing from `evercrisp-mastermind` is used.
- Sign-in is Google OAuth, restricted to the team via `team_members`, not via Google's `hd` domain hint (that is UX only, not enforced).
- The signed-in shell lives in a route group (`(app)/`), never the root layout, so no page outside it can leak sidebar content to a signed-out visitor.

## Verification
Actually run this session:
- `npm test` 50/50. `tsc --noEmit` clean. `eslint src mcp supabase` clean. `next build` passes, all routes dynamic (`/`, `/login`, `/d/[id]`, `/auth/callback`, `/auth/signout`, `/auth/not-authorized`, plus static `/_not-found`).
- Browser, fronted tab, before this session's auth work: created pages from the table and the sidebar; edited blocks, drag-reordered, searched with Cmd+K; each change read back correctly from disk.
- MCP: `mcp/smoke-test.ts` exercised all six tools over real stdio against a workspace copy.
- RLS on PGlite: member reads and writes; non-member and anonymous see nothing anywhere; nobody can add themselves to `team_members`.
- This session, auth: caught and fixed the shell rendering around `/login` (moved it into `(app)/layout.tsx`) by checking `sidebarPresent` in the browser, not by assuming the redirect alone was enough. Verified after the fix, in the browser and again against a production build: `/`, `/d/[id]` and an unmatched URL all redirect to `/login` unauthenticated; `/auth/not-authorized` renders standalone with the passed email; clicking "Continue with Google" reaches Supabase's real `/auth/v1/authorize` endpoint, which correctly reports "provider is not enabled" (expected, since Google is not turned on yet).
- Test pages created during browser testing were moved to the session scratchpad, not left in `workspace/`.

Not verified: an actual completed sign-in, and therefore publishing against the live database (both need Dave signed in; row-level security correctly blocks anyone else, including me).

Also run this session: `npm test` 67/67 (conflicts, imports, clock skew, session file), tsc and eslint clean, `next build` passes. `claude mcp get crisp`: Connected.

## Next action
Dave: turn off the Email provider in Supabase. Then decide with Ben whether Crisp stays local-first (each person runs `npm start`, works today) or gets hosted (needs drafts moved from disk into Supabase first). Still open from before: add `http://localhost:54390/callback` to Supabase redirect URLs and run `npm run mcp:login` for agent access to team documents.

## Blockers
- Google OAuth not yet enabled in the Supabase dashboard.
- `team_members` is empty; nobody can sign in until at least one row exists.
- Light theme can only be measured if Dave switches his Notion to Light briefly.
- Open questions for Ben in `vault/00-Index/Home.md`. The most consequential: internal only, or client-reachable?
