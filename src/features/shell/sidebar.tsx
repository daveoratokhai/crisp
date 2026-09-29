import { House, Plus } from "lucide-react";
import Link from "next/link";
import { copy } from "@/content/site";
import type { SidebarTree } from "@/features/workspace/tree";
import { CollapseButton } from "./collapse-button";
import { NewPageButton, NewPageIcon } from "./new-page";
import { SearchTrigger } from "@/features/search/search-dialog";
import { PageRow } from "./page-row";
import { SidebarSection, TeamspaceGroup } from "./sidebar-section";
import { ThemeButton } from "./theme-toggle";
import { WorkspaceMenu } from "./workspace-menu";

/**
 * The sidebar: search, Home, then Recent, My drafts (local, only you) and
 * Shared (what the team sees, grouped by client, process and Evercrisp).
 * Layout measurements come from the original Notion replica (270px, 30px
 * rows); Notion's own product features (inbox, chat, meetings, calendar,
 * agents, help, apps) were removed on 2026-09-29 as having no Crisp use.
 */
export function Sidebar({ tree, userEmail, writable }: { tree: SidebarTree; userEmail: string | null; writable: boolean }) {
  return (
    <nav
      aria-label="Workspace"
      className="flex h-full flex-col bg-sidebar shadow-[inset_-1px_0_0_0_var(--sidebar-edge)]"
    >
      <div className="shrink-0">
        <div className="flex h-11 items-center justify-between px-3">
          <CollapseButton />
          <div className="flex items-center gap-0.5">
            <ThemeButton toDark={copy.theme.toDark} toLight={copy.theme.toLight} />
            <NewPageIcon label={copy.sidebar.newPage} writable={writable} />
          </div>
        </div>

        <div className="px-3">
          <div role="search">
            <SearchTrigger label={copy.sidebar.search} shortcut={copy.sidebar.searchKey} />
          </div>
        </div>

        <div className="mt-3 px-2">
          <Link
            href="/"
            className="flex h-8 items-center gap-2 rounded-lg px-2 text-sm font-medium text-text-2 transition-colors hover:bg-hover"
          >
            <House size={18} strokeWidth={1.75} aria-hidden className="text-icon" />
            {copy.sidebar.home}
          </Link>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pt-4">
        {tree.recents.length > 0 && (
          <SidebarSection label={copy.sidebar.recents}>
            {tree.recents.map((doc) => (
              <PageRow key={doc.id} node={{ doc, children: [] }} expandable={false} />
            ))}
          </SidebarSection>
        )}

        <SidebarSection label={copy.sidebar.private}>
          {tree.private.map((doc) => (
            <PageRow key={doc.id} node={{ doc, children: [] }} />
          ))}
          <NewPageRow writable={writable} />
        </SidebarSection>

        {tree.teamspaces.length > 0 && (
          <SidebarSection label={copy.sidebar.teamspaces}>
            {tree.teamspaces.map((t) => (
              <TeamspaceGroup key={t.slug} label={t.label} badge={t.badge}>
                {t.pages.map((node) => (
                  <PageRow key={node.doc.id} node={node} depth={1} />
                ))}
              </TeamspaceGroup>
            ))}
          </SidebarSection>
        )}
      </div>

      <div className="flex h-11 shrink-0 items-center px-2">
        <WorkspaceMenu userEmail={userEmail} />
      </div>
    </nav>
  );
}

/** "+ New page": creates a local draft, which lands in My drafts until published. */
function NewPageRow({ writable }: { writable: boolean }) {
  return (
    <div className="rounded-md pl-2">
      <NewPageButton
        writable={writable}
        className="flex h-[30px] w-full items-center gap-2 rounded-md text-left text-sm text-faint hover:bg-hover disabled:opacity-50 aria-disabled:opacity-50"
      >
        <span className="grid size-[22px] place-items-center">
          <Plus size={16} strokeWidth={2} aria-hidden className="text-icon" />
        </span>
        {copy.sidebar.addNew}
      </NewPageButton>
    </div>
  );
}
