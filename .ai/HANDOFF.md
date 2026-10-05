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

- **Drive content imported** (2026-10-05): AI Content Cheat Sheet split into 4 pages (cheat sheet, hook library, YouTube titles, LinkedIn kit and repurposing) plus the Skill Pack source catalog, all under client `evercrisp` as notes, all published. The four process-stage READMEs in Drive were already in Crisp as the SOPs. Files are in `workspace/clients/evercrisp/` and not yet committed (repo is public).
- **MCP can now publish** (2026-10-05, Dave's explicit opt-in): `publish_document` added to `mcp/server.ts`, mirroring `publishDoc` in `src/app/actions.ts` exactly (conflict check, client/process upsert, block replacement). The file's header comment originally said publishing is "never something an agent does here"; Dave asked for this reversed after being shown the tradeoff. `create_document`/`update_document` still never publish on their own. Exercised once for real against the live project (published `ui-morph-demo-skill-muvl5ax7`).
- **Comments shipped** (2026-10-05): highlight any published text to leave a comment on it. New `comments` table (`supabase/migrations/20261005000001_comments.sql`, applied to the live project via `supabase db push` after a `migration repair` to mark the original schema migration as already-applied — its tracking row was missing even though the tables already existed), `addComment` server action (`src/app/actions.ts`), and `src/features/doc/doc-tabs.tsx` replacing the old inert Content/Comments tabs. Anchoring is the W3C "text quote" selector (quote + prefix/suffix context), re-located by content match on every render rather than a stored offset. Works on the read-only Vercel host (writes only to Supabase, never local disk). `npm run check` (tsc + eslint + 80 tests) and `next build` both clean. **Not yet verified live in a browser** — see Blockers.

## Files changed
- `crisp/` (new project). This session: `.env.local` (keys, git-ignored); `src/app/login/`, `src/app/auth/*`, `src/features/auth/*` (new); `src/app/layout.tsx` (stripped to root shell), `src/app/(app)/` (new group, holds the moved `page.tsx`, `d/[id]/page.tsx`, `not-found.tsx`, plus the new `layout.tsx` with the shell logic); `src/features/shell/{sidebar,workspace-menu}.tsx` (userEmail, sign-out row); `src/content/site.ts` (auth copy).
- `/Users/apple/Documents/Claude Code/.claude/launch.json`: `crisp` config on port 3100. Other configs untouched.
- 2026-10-05 session: `mcp/server.ts` (+publish_document); `src/app/actions.ts` (+addComment); `src/app/(app)/d/[id]/page.tsx` (wires DocTabs, drops dead notBuilt span); `src/content/site.ts` (+comments copy); `src/features/workspace/format.ts` (+formatDateTime); `supabase/schema.test.ts` (+comments in the RLS sweep); new `src/features/comments/{types,store}.ts`, `src/features/doc/doc-tabs.tsx`, `supabase/migrations/20261005000001_comments.sql`; `vault/` notes updated (Home, Roadmap, Technical Architecture, Design & Style).

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
- Comments only ever attach to a *published* document (a `document_id` FK, no separate permission to track): "can I comment here" is exactly "has this doc been published."
- Comment anchoring is content-based (quote + prefix/suffix), not an offset, so it survives unrelated edits; an edit to the quoted text itself orphans that one comment (still listed, just unhighlighted) rather than losing it.
- `publish_document` was a deliberate reversal of an existing safety boundary in `mcp/server.ts`, done only after flagging it and getting Dave's explicit yes (not something to repeat silently for future MCP write-capability requests).

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

2026-10-05 session (comments + publish_document): `npm run check` (tsc + eslint + vitest) clean, 80/80 tests (added `comments` to the RLS non-member sweep). `next build` clean. `publish_document` exercised for real over stdio against the live project (not just PGlite) — published `ui-morph-demo-skill-muvl5ax7`, confirmed via `read_document` afterward showing `state: published`. Migration applied live: `supabase migration repair --status applied 20260928000001` (its tracking row was missing even though the tables already existed) then `supabase db push`; `supabase migration list` confirms both migrations now match remote. **Browser verification of the comments UI itself was attempted and failed**: selecting text in a real browser produced a correct `window.getSelection()` but no floating "Comment" button appeared, and the Comments tab in the DOM still read "Not built yet" — because the deploy was stale (see Blockers), not because of a UI bug per se. Re-verify in the browser once the deploy below actually ships.

## Next action
Dave: turn off the Email provider in Supabase. Then decide with Ben whether Crisp stays local-first (each person runs `npm start`, works today) or gets hosted (needs drafts moved from disk into Supabase first). Still open from before: add `http://localhost:54390/callback` to Supabase redirect URLs and run `npm run mcp:login` for agent access to team documents.

Immediate: commit and push this session's work (comments + publish_document + vault) to `personal` (`daveoratokhai/crisp`, the Vercel-connected remote) so it actually deploys, then re-open `crisp-nu.vercel.app` and verify highlight → Comment button → post → shows in the Comments tab, in a real browser, signed in.

## Blockers
- Google OAuth not yet enabled in the Supabase dashboard.
- `team_members` is empty; nobody can sign in until at least one row exists.
- Light theme can only be measured if Dave switches his Notion to Light briefly.
- Open questions for Ben in `vault/00-Index/Home.md`. The most consequential: internal only, or client-reachable?
- **2026-10-05: everything this session was still uncommitted and unpushed as of writing this entry.** `git log` on `main` showed only 2 commits predating this entire session; `personal/main` (Vercel's source) never got the comments feature, so the live site still showed the old "Not built yet" Comments tab during browser testing. Confirm after pushing that Vercel's deployment actually picked up the new commit before trusting any live verification.
