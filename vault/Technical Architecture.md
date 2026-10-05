# Technical Architecture

## Stack

- Next 16.3.4 (Turbopack default), React 19.2.8, Tailwind 4, TypeScript 5
- `@supabase/ssr` 0.7 + `supabase-js` 2.117. Live: real project `tpynhxgwabwcrfymwfwn`, keys in `.env.local`
- `react-markdown` 10 + `remark-gfm` 4, `gray-matter` 4, `server-only`, `lucide-react` 1.48 (icons)
- `@modelcontextprotocol/sdk` 1.30 + `zod` 4 (MCP server), `tsx` (runs it), `@electric-sql/pglite` (schema tests)
- vitest 5. `@types/node` 24 to match the Node 24 runtime (20 blocked vitest 5)
- Dev server: port 3100, config `crisp` in `../.claude/launch.json`

## Files

| Path | Role |
| --- | --- |
| `src/features/blocks/types.ts` | Block union, 8 types |
| `src/features/blocks/to-markdown.ts` | Block to markdown. Exhaustive switch |
| `src/features/blocks/render.tsx` | Registry: block type to component |
| `src/features/workspace/doc.ts` | `Doc` type, `docState()` (only place state is computed) |
| `src/features/workspace/store.ts` | All disk reads and writes. Plain Node, relative imports, shared with the MCP server |
| `src/features/workspace/local.ts` | `loadWorkspace()`: local files merged with team documents, cached per request |
| `src/features/workspace/team.ts` | Pure: database row to `Doc`, `mergeDocs()` (local wins) |
| `src/features/workspace/team-fetch.ts` | Server-only: reads published documents as the signed-in user; never throws |
| `src/features/blocks/split.ts` | Markdown body to blocks and back (code fences kept whole) |
| `src/features/editor/*` | Block editor, slash menu, commands, title editor |
| `src/features/search/*` | Ranking (`rank.ts`, plain) and the Cmd+K dialog |
| `src/app/actions.ts` | Server actions: save body, rename, create page, publish, **addComment** (2026-10-05). Validates input, then `refresh()` |
| `src/features/shell/share-button.tsx` | Two-click publish button (document pages only) |
| `src/features/comments/types.ts`, `store.ts` | `Comment` type; `loadComments()`, server-only, read via RLS |
| `src/features/doc/doc-tabs.tsx` | Content/Comments tabs (replaces the old inert placeholder spans): selection → floating "Comment" button → composer; re-locates every comment's quote in the rendered text each render and underlines it; click a highlight ↔ click a comment card to jump between them |
| `supabase/migrations/20261005000001_comments.sql` | `comments` table: document_id FK, author_id/author_email, quote/prefix/suffix (W3C text-quote anchor), body. Same per-table RLS policy shape as every other table |
| `mcp/server.ts`, `mcp/smoke-test.ts` | MCP server and its end-to-end protocol test. `publish_document` (2026-10-05) added alongside the read/create/update tools — writes straight to the team Supabase table using the agent's own session, mirroring `publishDoc` in `actions.ts` |
| `mcp/session.ts`, `mcp/login.ts` | Agent's own Supabase session (~/.crisp/agent-session.json, 0600, re-read every call) and the `mcp:login` OAuth flow on port 54390 |
| `src/features/shell/team-newer-notice.tsx` | "A teammate shared a newer version" notice, two-click take-theirs |
| `supabase/migrations/`, `seed.sql`, `schema.test.ts` | Shared-layer schema, seed, PGlite tests |
| `src/features/workspace/tree.ts` | Notion sidebar model (Recents / Private / Teamspaces) and `breadcrumb()` |
| `src/features/workspace/links.ts` | `docHref()`. Plain module: used by server and client |
| `src/features/workspace/format.ts` | `formatDate()`, Notion's "September 28, 2026" |
| `src/features/database/table-view.tsx` | Notion table view (Home) |
| `src/features/shell/sidebar.tsx` | Sidebar assembly (server) |
| `src/features/shell/page-row.tsx` | Expandable 30px page row (client) |
| `src/features/shell/sidebar-section.tsx` | Foldable section label and teamspace header (client) |
| `src/features/shell/shell-frame.tsx` | Layout frame: desktop collapse, phone drawer, context |
| `src/features/shell/topbar.tsx` | 44px page top bar, publish state, Share |
| `src/features/shell/page-column.tsx` | 96px-padded page column and hover page controls |
| `src/features/shell/icon-button.tsx` | 28px icon button, `notBuilt` props |
| `src/features/shell/workspace-menu.tsx` | Footer switcher with the appearance menu |
| `src/features/shell/theme-toggle.tsx` / `theme-script.ts` | Theme store (client) / before-paint script (plain) |
| `src/app/layout.tsx` | True root: html/head/body only |
| `src/app/(app)/layout.tsx` | The shell (sidebar, search dialog, workspace read). A route group: adds no URL segment |
| `src/app/(app)/page.tsx` | Home: all documents as a table |
| `src/app/(app)/d/[id]/page.tsx` | Document page: title, properties, blocks |
| `src/app/(app)/not-found.tsx` | 404 with the shell, for `notFound()` inside `(app)/` |
| `src/app/not-found.tsx` | 404 without the shell, for an unmatched URL entirely |
| `src/app/login/page.tsx` | Sign-in page |
| `src/app/auth/callback/route.ts` | Exchanges the OAuth code, checks `team_members`, signs out non-members |
| `src/app/auth/signout/route.ts`, `auth/not-authorized/page.tsx` | Sign out; the "not on the team" page |
| `src/features/auth/google-button.tsx` | The sign-in button, client-side (the OAuth redirect happens in the browser) |
| `src/proxy.ts` | Auth fence. Passes through when Supabase env is missing; live now that it is set |
| `src/content/site.ts` | All copy |
| `workspace/` | Local documents |

Tests: `*.test.ts` beside the code. 80 tests: markdown serialisation, block splitting, store writes (temp dirs), publish state, sidebar tree, breadcrumbs, slash commands, search ranking, schema and RLS (now including `comments`, added to the same "non-member sees nothing" sweep as every other table).

## Data model (schema live on the real project; nothing published through it yet)

`clients`, `engagements` (phase: intake / assessment / workshop / backlog / implementation), `documents`, `blocks` (document_id, position, block_type, content jsonb, storage_path), `processes`, `decisions`. RLS on every table. `tsvector` over titles plus block markdown.

## Security model (2026-09-29)

- Proxy (`src/proxy.ts`): session + `team_members` row, or redirect. Skips `/login` and `/auth/*`.
- Server actions (`src/app/actions.ts`): `requireMember()` first (`src/features/auth/guard.ts`, tested with a mocked client).
- Database: RLS on every table, membership via `is_team_member()`.
- Headers: `next.config.ts` (CSP without nonces per Next's guide, XFO DENY, nosniff, referrer, permissions, HSTS).
- Network: `dev` and `start` bind 127.0.0.1.
- Audit: `npm audit` 0 vulnerabilities; `npm audit signatures` verified; install scripts only in dev tooling.

## Gotchas found

- **Server actions are reachable from any path.** A page-level or proxy check does not cover them; `/login` is let through the proxy. Each action checks membership itself (Next's data-security guide says the same).
- **A Supabase session is not proof of membership.** The anon key is public; anyone can sign up by email and hold a session. The proxy now checks `team_members`.
- **`upgrade-insecure-requests` breaks a plain-http local server.** Removed until Crisp is served over https.

- **A server added with `claude mcp add` is not visible to the session that added it.** Sessions load MCP servers at start. Proved it with a fresh `claude -p` session instead.
- **Next hides thrown server-action messages in production.** Expected failures (conflicts, not signed in) are returned as values (`PublishResult`), per Next's own error-handling guide. The Share button used to show `error.message`, which production would have replaced with a generic string.
- **Refresh tokens rotate.** The agent cannot share the browser's session (whichever refreshed second would sign the other out), so it has its own. Several MCP processes share one file, re-read on every access, written atomically.
- **Clock skew between teammates.** `published_at` comes from the publisher's machine. An edit on a machine whose clock is behind could have read as older than the publish, so still "Published". `update()` now stamps edits at least 1 ms after `published_at`.
- **Putting the shell in the root layout leaked it to signed-out visitors.** The sidebar (with real document titles) rendered around `/login` itself. Fixed by moving the sidebar/search/workspace-read into `src/app/(app)/layout.tsx`, a route group, and leaving the root layout as html/head/body only.
- **`signInWithOAuth`'s error return only catches failures before the browser redirects.** "Provider not enabled" is returned by Supabase's `/auth/v1/authorize` endpoint after the tab has already navigated there, so it shows as a raw JSON page, not a caught `error`. Confirmed by testing before Google was enabled; harmless, but worth knowing so it is not mistaken for a bug in the button.
- **Middleware is `proxy` in Next 16.** Wrong name runs nothing, silently.
- **Workspace pages were prerendered.** `/` built as static, so new files never showed in production. Fixed with `await connection()` inside `loadWorkspace()`. Proven on a running production server.
- **gray-matter returns Dates** and numbers from frontmatter. `toIso()` normalises. `docState()` compares instants, since `...00Z` and `...00.000Z` are the same moment.
- **Phone menu button was unreachable.** The sticky header (z-10) painted over it. Fixed at z-15. Found only in a real browser at 375px.
- **Client-module exports are not callable on the server.** `docHref` lived in a client file; the server-rendered table called it and every page failed to render. tsc and lint passed. Moved to `links.ts`; `themeScript` moved to `theme-script.ts` for the same reason.
- **"Encountered a script tag" was a symptom**, not a cause: React logs it when a failed server render falls back to client rendering. Fixing the render removed it.
- **Tailwind same-property overrides are order-independent of class order.** `IconButton` takes `tone` and `tall` props instead of className overrides.
- **Server-to-client props must be plain data.** Passing an icon component from the server sidebar into a client button broke every page. The button now imports its own icon.
- **Layouts survive navigation.** Creating a page and navigating left the sidebar stale; `createPage` calls `refresh()`.
- **Two keyboard listeners on one textarea acted on Enter twice** (slash menu applied a heading, then the editor split the block). The editor's single handler now owns the menu keys.
- **Vitest does not read tsconfig paths**; `vitest.config.mts` maps `@/`. It must be `.mts`: the package is CommonJS.
- **tsx runs .ts as CommonJS here**, so no top-level `await` in scripts.
- **Background browser tabs freeze CSS transitions** at frame 0. The phone drawer looked broken in a background test tab and worked in a fronted one.
- **Geist request in dev** comes from Next's dev overlay, not the app. Production HTML has no webfont.
- **`NEXT_DIST_DIR` is not a Next setting.** Builds go to `.next`; dev output is isolated in `.next/dev`.
- **React Compiler lint** rejects setState in effects and DOM mutation in handlers. Theme uses `useSyncExternalStore`; drawer uses derived state.
- **React Compiler lint also rejects reading `ref.current` during render**, including inline `ref={el => ...}` callbacks on a mapped list (`doc-tabs.tsx`'s comment cards). Fixed by using a plain `data-comment-id` attribute plus `querySelector` from an effect/handler instead of a ref map, and by deriving "orphaned" status into state inside the effect that computes it rather than reading the marks ref during the render pass.
- **Manually mutating a React-rendered subtree is fragile**, even outside render: `doc-tabs.tsx` wraps comment quotes in `<mark>` via raw DOM (`Range.surroundContents`) because ReactMarkdown owns that subtree and splitting its output around arbitrary markdown character offsets isn't tractable. Kept safe by always fully unwrapping the previous pass's marks before re-wrapping (so DOM structure returns to exactly what React last rendered before React could ever diff against it), and by never doing this under a block that's actively being edited (edit mode swaps to a plain `<textarea>`, an entirely different React branch, so there's nothing manually mutated for React to reconcile into).


## Hosting on Vercel (2026-10-05)
- `src/lib/deploy.ts` `isReadOnlyHost()` is true when `VERCEL === "1"`. `assertWritable()` in `features/auth/guard.ts` runs before `requireMember()` in every write action; pages pass `writable` to the sidebar, title, editor, Share and team-newer notice, which disable themselves with `copy.topbar.readOnlyHost` / `copy.editor.readOnly`. Tested in `features/auth/deploy.test.ts`.
- Vercel project `evercrisp/crisp`, env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` set for Production and Preview. Pushing `main` to `daveoratokhai/crisp` auto-deploys.
- Gotcha: `vercel link` writes a `VERCEL_OIDC_TOKEN` into the git-ignored `.env.local`; harmless.
- Gotcha: the org repo could not connect because only org owners can authorize Vercel's GitHub App.
- Gotcha: Supabase only redirects to exact URLs in its Redirect URLs list; each new domain needs `<origin>/auth/callback` added.
- Gotcha: a `\u00a0` non-breaking space sits in `doc-editor.tsx` placeholder text; exact-string edits against it fail silently.
