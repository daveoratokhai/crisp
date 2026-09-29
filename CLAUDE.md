@AGENTS.md

# Working rules for Crisp

Read `vault/00-Index/Home.md` before changing anything. The vault is the record of decisions.

## Next 16 and React traps already hit here

- Middleware is `proxy`: file `src/proxy.ts`, export `proxy`. The old name silently never runs.
- `params`, `searchParams` and `cookies()` are Promises. Always await them.
- `PageProps` / `LayoutProps` are generated. Run `npx next typegen` if tsc cannot find them.
- Anything reading the workspace from disk must go through `loadWorkspace()`, which calls `connection()`. Without it the page is prerendered at build time and new files never appear in production.
- **Never export a function or value from a client module for server use.** On the server it is only a reference: calling it throws, and tsc does not notice. Shared helpers live in plain modules (`features/workspace/links.ts`, `features/shell/theme-script.ts`). Only components cross from client to server.
- **Never pass a function (including an icon component) as a prop from a server component to a client component.** Props crossing that line must be plain data; it fails at runtime, not in tsc. Let the client component import its own icon.
- **Modules the MCP server loads use relative imports and no Next imports** (`features/workspace/store.ts`, `doc.ts`, `tree.ts`, `blocks/*`, `search/rank.ts`). `mcp/server.ts` must never write to stdout: that is the protocol.
- **One key handler per input.** The editor's own `onKeyDown` handles the slash menu's keys. A second listener for the same keys once acted on Enter twice.
- A React "Encountered a script tag" error usually means the server render failed and React fell back to client rendering. Read the dev server log first; the script is not the cause.
- Two responsive variants setting the same property must be comparable breakpoints: an arbitrary `min-[1360px]:grid-cols-*` lost to `lg:grid-cols-*` and the detail panel wrapped onto its own row. Use a named breakpoint (`wide`, in globals.css).
- Do not override a Tailwind utility with another for the same property via `className` (e.g. `text-icon` then `text-topbar-icon`). The winner is decided by stylesheet order, not class order. Use a prop (see `IconButton`'s `tone` and `tall`).
- **The signed-in shell (sidebar, search dialog, workspace read) lives in `src/app/(app)/layout.tsx`, not the root `src/app/layout.tsx`.** The root layout is html/head/body only. A page that must render without the sidebar (`/login`, `/auth/*`) goes outside `(app)/`; a page that is part of the app goes inside it. Putting the shell in the root layout means a signed-out visitor sees the sidebar, with real document titles, before ever signing in: that happened once.
- `notFound()` thrown inside `(app)/` renders `(app)/not-found.tsx` (keeps the shell). A URL matching no route at all renders the root `app/not-found.tsx` (no shell) via the proxy redirect or Next's own fallback. Keep both in sync if the 404 copy changes.
- **Every server action calls `requireMember()` first** (`features/auth/guard.ts`). Actions are public POST endpoints reachable at any path, including `/login`, which the proxy lets through. A new action without it is an open write endpoint.
- **The proxy checks `team_members`, not just a session.** The anon key is public, so anyone can create a Supabase account and hold a session.
- Scripts bind to `127.0.0.1`. Do not change `dev`/`start` to listen on all interfaces: local-only mode has no sign-in at all.
- No `upgrade-insecure-requests` in the CSP while Crisp is served over plain http locally.
- Auth's real boundary is `team_members`, checked in `src/app/auth/callback/route.ts`, not the `hd=evercrisp.ai` param on the Google button. `hd` only narrows Google's account picker and is not enforced; anyone with a Google account can complete OAuth, but only a `team_members` row gets them past the callback. No row: signed back out immediately, before the session ever reaches `(app)/`.

## Testing traps

- Test UI in a **fronted** browser tab. Background tabs freeze CSS transitions at frame 0, which makes working drawers look broken.
- `curl` on a streamed page can miss elements rendered through React's payload (the 404 page's sidebar). Check real rendering in a browser.
- In zsh, never name shell variables `path` or `status`.

## Rules

1. Tokens only. No raw hex in components; add a token to `globals.css`.
2. The look (2026-09-29): Evercrisp's own palette and type from projects.evercrisp.ai (teal-tinted slate, 16px cards, pill buttons, Google Sans via next/font), a Notion-style sidebar, and OpenMetadata-style Explore and document pages. Home renders Explore. Light-mode teal is `#00747a`, deliberately darker than the site's `#00868d`, which fails AA. Measure any new colour pair; every text pair passes AA in both themes. Do not reintroduce Notion features or words (Teamspaces, Private, Share, favourites, page covers).
3. All user-facing copy goes in `src/content/site.ts`.
4. Code is organised by feature under `src/features/`.
5. Every block type needs a `to-markdown.ts` case. The exhaustive switch enforces it.
6. Publish state is computed only in `docState()`. Do not re-derive it elsewhere.
7. No dead UI. Controls for planned features that are not built yet spread `notBuilt` (from `features/shell/icon-button.tsx`): `aria-disabled` plus a "Not built yet" tooltip. Never a silent no-op.
8. Verify UI changes in a real browser at desktop and 375px, and check the dev server log. Tests have passed with a phone-breaking bug and twice with pages that did not render at all.
9. Writes go through `features/workspace/store.ts` only (the app via `src/app/actions.ts`, agents via `mcp/server.ts`). Never write workspace files any other way.
10. Never use the em dash character anywhere.
