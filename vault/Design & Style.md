# Design & Style

**Current direction (2026-09-29, second pass): Evercrisp's look, Notion's sidebar, OpenMetadata's pages.** Dave kept only OpenMetadata's Explore layout and document layout, asked for the Notion-style sidebar back, and for Evercrisp's own colours from projects.evercrisp.ai (light and dark). The OpenMetadata rail, top bar and Home dashboard were set aside (session scratchpad).

### Evercrisp palette (read from projects.evercrisp.ai's CSS variables, lab() converted to hex)

| Token | Light | Dark | Source |
| --- | --- | --- | --- |
| `--bg` | `#eaf9f9` | `#091a1e` | `--background` |
| `--surface` / `--sidebar` | `#ffffff` | `#122529` | `--card` |
| `--text` | `#15292e` | `#e6efef` | `--foreground` |
| `--muted` / `--icon` | `#506a6f` | `#90a6a9` | `--muted-foreground` |
| `--hover` | `#e5f2f3` | `#1c2f33` | `--muted` |
| `--accent-soft` | `#d9f0f1` | `#20373b` | `--accent` |
| `--line` / `--grid` | `#d0e3e4` | `#34474a` / `#2d3f43` | `--border`, `--input` |
| `--blue` + `--on-blue` | **`#00747a`** + `#f6fbfb` | `#49c1c4` + `#04191e` | `--primary` (light darkened for AA) |
| `--link` | `#00747a` | `#49c1c4` | primary |
| success / warning | `#007a55` on `#e0f7f0`, `#bb4d00` on `#fff1db` | `#5ee9b5` on `#0f3d37`, `#ffd230` on `#383822` | emerald / amber pills |

Radius: cards 16px (`rounded-2xl`), buttons and filter chips pills (`rounded-full`), as on the site. Font: Google Sans and Google Sans Code through `next/font/google`, self-hosted at build (no runtime request to Google). Build warns "Failed to find font override values": only the fallback size-adjust metrics, harmless.

Light teal: the site's `#00868d` gives 4.19:1 for white button text and 4.38:1 as link text, both under AA. `#00747a` gives 5.32 and 5.56 and looks the same.

### Earlier today: OpenMetadata mapping (Explore and document page still use it)

## Mapping

| OpenMetadata | Crisp | Where |
| --- | --- | --- |
| Left rail, blue filled active item, expandable groups | Home, Explore, My drafts; Clients and Processes groups with counts; New page at the bottom | `features/shell/app-rail.tsx`, `rail-link.tsx` |
| Top bar: search, All Domains, user | Search (Enter → Explore; ⌘K quick search), client picker, you (appearance, sign out) | `app-header.tsx`, `header-search.tsx`, `client-scope.tsx`, `workspace-menu.tsx` |
| Explore: filter chips, QUERY line, three panes | Type / Client / Process / Status filters + sort, all in the URL; browse tree; result cards; detail panel | `app/(app)/explore/page.tsx`, `features/explore/*` |
| Entity page: header card, properties strip, tabs | Breadcrumb, title, Publish; Client / Process / Type / Status / Updated / Published; Content and Comments tabs (comments shipped 2026-10-05: highlight published text to comment) | `app/(app)/d/[id]/page.tsx`, `features/doc/doc-tabs.tsx` |
| Home dashboard | Stats linking into Explore, recently edited, your drafts, clients | `app/(app)/page.tsx` |

Responsive: rail becomes a drawer below 1024px; browse pane from 1024px; detail panel from 1280px. Below that, a card opens the document instead of selecting it.

## Tokens (all text pairs AA in both themes, measured 2026-09-29)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#f5f6f8` | `#0c111d` | canvas |
| `--surface` / `--sidebar` | `#ffffff` | `#161b26` | cards, rail, top bar |
| `--grid` / `--sidebar-edge` | `#eaecf0` | `#1f242f` | card borders, dividers |
| `--line` | `#d0d5dd` | `#333741` | inputs, hover borders |
| `--text` | `#101828` | `#f5f5f6` | primary text |
| `--text-2` | `#344054` | `#cecfd2` | secondary text |
| `--muted` / `--icon` | `#667085` | `#94969c` | metadata, icons (4.97 / 5.83) |
| `--blue` + `--on-blue` | `#1570ef` + white | same | primary buttons, active rail (4.57) |
| `--link` | `#175cd3` | `#84adff` | titles, links |
| `--accent-soft` | `#eff4ff` | `#102a56` | selected, applied filters |
| `--success` on `--success-bg` | `#067647` / `#ecfdf3` | `#75e0a7` / `#053321` | Published |
| `--warning` on `--warning-bg` | `#b54708` / `#fffaeb` | `#fec84b` / `#4e1d09` | Unpublished changes, newer-version notice |

Status pills: Draft (grey), Published (green), Unpublished changes (amber), From the team (blue). Label always present.

## History

**Current direction (2026-09-28): a replica of Notion's layout, to be customised later.** Dave's call. Implemented in `src/app/globals.css`. The earlier Evercrisp palette is parked at the bottom of this note.

Source: a live Notion full-page database, dark theme, 1003x946 viewport, measured with the browser's computed styles. Rebuilt in Crisp's own code; icons are Lucide (open source), not Notion's.

## Tokens

| Token | Dark (measured) | Light (unmeasured) | Use |
| --- | --- | --- | --- |
| `--bg` | `rgb(25,25,25)` | `#ffffff` | page |
| `--sidebar` | `rgb(32,32,32)` | `rgb(248,248,247)` | sidebar |
| `--sidebar-edge` | `rgb(44,44,43)` | `rgb(238,238,236)` | 1px inset shadow, sidebar right edge |
| `--text` | `rgb(240,239,237)` | `rgb(44,44,43)` | primary text, active row |
| `--text-2` | `rgb(188,186,182)` | `rgb(95,94,91)` | sidebar rows |
| `--icon` | `rgb(173,169,163)` | `rgb(120,119,116)` | sidebar icons, table headers |
| `--topbar-icon` | `rgb(230,229,227)` | `rgb(95,94,91)` | top bar icons |
| `--muted` | `rgb(125,122,117)` | `rgb(145,144,140)` | section labels, placeholders |
| `--faint` | `rgb(155,155,155)` | same as muted | "Add new" rows |
| `--kbd` | `rgb(142,139,134)` | `rgb(165,164,160)` | ⌘K, "Add property" |
| `--hover` | `rgba(255,255,255,0.055)` | `rgba(55,53,47,0.06)` | hover, active row, Home pill, view tab |
| `--line` | `rgba(255,255,235,0.1)` | `rgba(55,53,47,0.16)` | search border, badges, ⌘K |
| `--grid` | `rgba(255,255,243,0.082)` | `rgba(55,53,47,0.09)` | table rules |
| `--title-placeholder` | `rgb(55,55,55)` | `rgb(225,224,222)` | empty title |
| `--blue` / `--on-blue` | `rgb(39,131,222)` / `rgb(243,249,253)` | `rgb(35,131,226)` / white | New button |

Light column: Notion's standard light palette as known. Dave's Notion is set to dark explicitly, so it could not be measured without changing his account setting. ⬜ Measure and correct if light matters.

## Measured geometry

| Element | Value |
| --- | --- |
| Sidebar | 270px wide |
| Top row | 44px; 28px icon buttons at x12, x200, x230, y8 |
| Search | x12 y44, 246x32, radius 8, 1px `--line`; ⌘K 26x18, radius 4 |
| Home pill | x11 y88, 80x32, radius 8, 5px left pad; Chat and Meetings follow at 4px gaps |
| Section label | 30px row, 12px/500 `--muted`, 18px below each section |
| Page row | 30px, 1px apart; 20px icon at x17; text at x46; +8px per nesting level |
| Teamspace header | 28px; 20px letter badge (radius 3, `--line` fill); name at x45, 14px/500 |
| Footer | 44px; switcher 194x28; help and apps 28x28 |
| Top bar | 44px; breadcrumb from x18 (14px); Share 71x28; icon buttons 28px, 2px apart |
| Page column | 96px side padding, 708px content cap (900 with padding) |
| Database title | 32px/38.4, weight 700, 8px inner padding, 36px below the top bar |
| View tab | 85x32 pill, radius 20, 6px x 12px padding |
| Toolbar | six 16px icons on a 28px pitch; split New button 28px tall, radius 6 |
| Table | header 36px; rows 37px (36 + 1px rule); Name column 280px |

Page title (40px), page typography, property rows and code styling are Notion's known defaults, not measured: the page Dave shared is an empty database.

## Departures from Notion (Crisp's own)

- **Document header, centred** (2026-09-28): title and its hover controls centred. Properties are a centred row of cells: 12px muted label with a 13px icon above a 14px value. Cells are a fixed fifth of the column on desktop (one row), a third on a phone (remainder centred). `src/app/d/[id]/page.tsx`. Home (the table page) stays left-aligned.

## Patterns

- **Private = local.** Local documents live only under Private, as private pages do in Notion. Published ones live in Teamspaces.
- **Publish state in the top bar**, in Notion's vocabulary: lock + "Private" for local, "Unpublished changes" (muted) for changed, nothing for published.
- **Share = publish.** Disabled with the reason until the database exists.
- **Copied controls with no feature** spread `notBuilt`: same look and hover, `aria-disabled`, "Not built yet" tooltip.
- **Page rows**: icon turns into an expand chevron on hover; "…" and "+" appear on the right. A row holding the open page starts expanded.
- **Sidebar collapse** works on desktop; phone uses a drawer below 768px.
- **Theme** lives in the workspace switcher menu (Notion keeps it in Settings).

## Contrast (Notion's own values, copied as-is)

| Pair | Ratio | AA |
| --- | --- | --- |
| Page text | 15.30 | ✅ |
| Sidebar rows | 8.41 | ✅ |
| Section labels, search placeholder | 3.81 | ❌ |
| Top bar "Private" / "Unpublished changes" | 4.11 | ❌ |
| "New page" row | 4.11 | ❌ |
| White on blue New button | 3.67 | ❌ |
| Table grid | 1.26 | decorative, exempt |

⬜ When customising, fix "Unpublished changes" first: it is the state that must never be hard to read.

## Known differences from Notion

- Icons are Lucide outlines; Notion fills some (Home, Chat, Calendar).
- "Notion apps" section and the Notion AI corner button omitted: Notion's own products, not layout.

## Parked: the Evercrisp palette (2026-09-28, superseded same day)

For when Crisp gets customised. Source `~/.claude/skills/evercrisp-deck/reference/design-tokens.md`. Rule was "palette yes, density no".

| Token | Light | Dark |
| --- | --- | --- |
| paper | `#fffcf6` | `#1a1f24` |
| cream | `#f6f1e7` | `#15191d` |
| ink | `#22303a` | `#e8eef2` |
| body | `#3b4550` | `#c2ccd4` |
| muted | `#5c6670` | `#8b969f` |
| teal | `#1a6b70` | `#4fa8ad` |
| orange (marks) | `#d56f1b` | `#ff9442` |
| orange-ink (text) | `#a95815` | `#ff9442` |

All measured AA. The deck's `#e8791d` fails (2.85:1), hence the orange split. Headings 800 weight, -0.02em tracking.
